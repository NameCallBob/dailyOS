"""Tests for the `supplements` resource: mirrors `medications` (identical
shape per contract §2), covering CRUD, owner scoping, and toggle-active."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.meds.tests.factories import SupplementFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestSupplementCRUD:
    def test_create_supplement(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Vitamin D",
            "dose": 1000,
            "unit": "IU",
            "frequency": "daily",
            "times": ["08:00"],
            "start_date": "2026-07-01",
            "with_food": "with_food",
            "active": True,
        }
        response = client.post("/api/v1/supplements/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        SupplementFactory(user=user)
        SupplementFactory(user=other)
        client = authed_client(user)
        response = client.get("/api/v1/supplements/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_supplement_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        supplement = SupplementFactory(user=owner)
        client = authed_client(intruder)
        response = client.get(f"/api/v1/supplements/{supplement.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_destroy_soft_deletes(self):
        user = UserFactory()
        supplement = SupplementFactory(user=user)
        client = authed_client(user)
        response = client.delete(f"/api/v1/supplements/{supplement.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        supplement.refresh_from_db()
        assert supplement.deleted is True
        assert client.get("/api/v1/supplements/").data["count"] == 0
        assert client.get("/api/v1/supplements/?deleted=true").data["count"] == 1

    def test_toggle_active_action(self):
        user = UserFactory()
        supplement = SupplementFactory(user=user, active=True)
        client = authed_client(user)
        response = client.post(f"/api/v1/supplements/{supplement.id}/toggle-active/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["active"] is False
        assert response.data["version"] == 2

    def test_toggle_active_other_users_supplement_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        supplement = SupplementFactory(user=owner)
        client = authed_client(intruder)
        response = client.post(f"/api/v1/supplements/{supplement.id}/toggle-active/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
