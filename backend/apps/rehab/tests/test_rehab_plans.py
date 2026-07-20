"""Tests for the `rehab_plans` resource: CRUD, owner scoping, soft delete,
and the toggle-active action."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.rehab.tests.factories import RehabPlanFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestRehabPlanCRUD:
    def test_create_rehab_plan(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "膝蓋術後復健",
            "body_region": "膝關節",
            "diagnosis": "ACL 重建術後",
            "goal": "恢復完整活動度",
            "therapist_name": "陳治療師",
            "clinic_name": "康復診所",
            "active": True,
            "start_date": "2026-01-01",
            "review_notes": [],
        }
        response = client.post("/api/v1/rehab_plans/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert response.data["name"] == "膝蓋術後復健"
        assert "id" in response.data

    def test_create_with_review_notes(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "肩關節復健",
            "active": True,
            "start_date": "2026-02-01",
            "review_notes": [
                {"id": "r1", "date": "2026-02-10", "note": "進度良好", "adjustment": True}
            ],
        }
        response = client.post("/api/v1/rehab_plans/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["review_notes"][0]["note"] == "進度良好"

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        RehabPlanFactory(user=user)
        RehabPlanFactory(user=other)
        client = authed_client(user)
        response = client.get("/api/v1/rehab_plans/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_plan_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        client = authed_client(intruder)
        response = client.get(f"/api/v1/rehab_plans/{plan.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_other_users_plan_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        client = authed_client(intruder)
        response = client.patch(
            f"/api/v1/rehab_plans/{plan.id}/", {"name": "hacked"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_increments_version(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user, name="Original")
        client = authed_client(user)
        response = client.patch(
            f"/api/v1/rehab_plans/{plan.id}/", {"name": "Renamed"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Renamed"
        assert response.data["version"] == 2

    def test_destroy_soft_deletes_and_excludes_from_default_list(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        client = authed_client(user)

        response = client.delete(f"/api/v1/rehab_plans/{plan.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        plan.refresh_from_db()
        assert plan.deleted is True
        assert plan.version == 2

        list_response = client.get("/api/v1/rehab_plans/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/rehab_plans/?deleted=true")
        assert list_with_deleted.data["count"] == 1

    def test_toggle_active_flips_flag_and_bumps_version(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user, active=True)
        client = authed_client(user)

        response = client.post(f"/api/v1/rehab_plans/{plan.id}/toggle-active/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["active"] is False
        assert response.data["version"] == 2

        response2 = client.post(f"/api/v1/rehab_plans/{plan.id}/toggle-active/")
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["active"] is True
        assert response2.data["version"] == 3

    def test_toggle_active_other_users_plan_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        client = authed_client(intruder)
        response = client.post(f"/api/v1/rehab_plans/{plan.id}/toggle-active/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
