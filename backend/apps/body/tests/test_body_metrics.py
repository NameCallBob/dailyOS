import pytest
from rest_framework import status
from rest_framework.test import APIClient

from .factories import BodyMetricsFactory, UserFactory

pytestmark = pytest.mark.django_db


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_PAYLOAD = {
    "date": "2026-07-20",
    "logged_at": "2026-07-20T08:00:00Z",
    "weight_kg": "70.50",
    "body_fat_percent": "18.20",
    "source": "manual",
    "note": "morning weigh-in",
    "custom_metrics": [{"id": "1", "label": "grip", "value": 42, "unit": "kg"}],
}


def test_create_body_metrics():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post("/api/v1/body_metrics/", VALID_PAYLOAD, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["weight_kg"] == "70.50"
    assert response.data["source"] == "manual"
    assert response.data["version"] == 1
    assert response.data["deleted"] is False
    assert "id" in response.data and "created_at" in response.data


def test_list_body_metrics_scoped_to_owner():
    user = UserFactory()
    other = UserFactory()
    BodyMetricsFactory(user=user)
    BodyMetricsFactory(user=other)

    client = _authed_client(user)
    response = client.get("/api/v1/body_metrics/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert set(response.data.keys()) == {"results", "count", "next", "previous"}


def test_retrieve_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = BodyMetricsFactory(user=owner)

    client = _authed_client(intruder)
    response = client.get(f"/api/v1/body_metrics/{record.id}/")

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_body_metrics_increments_version():
    user = UserFactory()
    record = BodyMetricsFactory(user=user)
    client = _authed_client(user)

    response = client.patch(
        f"/api/v1/body_metrics/{record.id}/", {"weight_kg": "71.00"}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["weight_kg"] == "71.00"
    assert response.data["version"] == record.version + 1


def test_soft_delete_excludes_from_default_list():
    user = UserFactory()
    record = BodyMetricsFactory(user=user)
    client = _authed_client(user)

    delete_response = client.delete(f"/api/v1/body_metrics/{record.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    list_response = client.get("/api/v1/body_metrics/")
    assert list_response.data["count"] == 0

    list_with_deleted = client.get("/api/v1/body_metrics/?deleted=true")
    assert list_with_deleted.data["count"] == 1
    assert list_with_deleted.data["results"][0]["deleted"] is True


def test_weight_kg_must_be_greater_than_zero():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, weight_kg="0")
    response = client.post("/api/v1/body_metrics/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "validation_error"
    assert "weight_kg" in response.data["field_errors"]


def test_weight_kg_must_be_at_most_400():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, weight_kg="401")
    response = client.post("/api/v1/body_metrics/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "weight_kg" in response.data["field_errors"]


def test_custom_metrics_label_length_validated():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(
        VALID_PAYLOAD,
        custom_metrics=[{"id": "1", "label": "x" * 21, "value": 1, "unit": "kg"}],
    )
    response = client.post("/api/v1/body_metrics/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "custom_metrics" in response.data["field_errors"]


def test_filter_by_date():
    user = UserFactory()
    BodyMetricsFactory(user=user, date="2026-07-19")
    BodyMetricsFactory(user=user, date="2026-07-20")
    client = _authed_client(user)

    response = client.get("/api/v1/body_metrics/?date=2026-07-20")

    assert response.data["count"] == 1
    assert response.data["results"][0]["date"] == "2026-07-20"


def test_requires_authentication():
    client = APIClient()
    response = client.get("/api/v1/body_metrics/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
