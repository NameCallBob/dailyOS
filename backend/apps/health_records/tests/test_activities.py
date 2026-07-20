import pytest
from rest_framework import status
from rest_framework.test import APIClient

from .factories import ActivityFactory, UserFactory

pytestmark = pytest.mark.django_db


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_PAYLOAD = {
    "type": "daily_summary",
    "occurred_at": "2026-07-20T00:00:00Z",
    "date": "2026-07-20",
    "steps": 8000,
    "source": "manual",
    "is_primary": True,
}


def test_create_activity():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post("/api/v1/activities/", VALID_PAYLOAD, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["source"] == "manual"
    assert response.data["is_primary"] is True
    assert response.data["version"] == 1
    assert response.data["deleted"] is False


def test_list_scoped_to_owner_idor_protection():
    user = UserFactory()
    other = UserFactory()
    ActivityFactory(user=user)
    ActivityFactory(user=other)

    client = _authed_client(user)
    response = client.get("/api/v1/activities/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


def test_update_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = ActivityFactory(user=owner)

    client = _authed_client(intruder)
    response = client.patch(
        f"/api/v1/activities/{record.id}/", {"steps": 100}, format="json"
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_increments_version():
    user = UserFactory()
    record = ActivityFactory(user=user)
    client = _authed_client(user)

    response = client.patch(
        f"/api/v1/activities/{record.id}/", {"steps": 12000}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["version"] == record.version + 1


def test_soft_delete():
    user = UserFactory()
    record = ActivityFactory(user=user)
    client = _authed_client(user)

    delete_response = client.delete(f"/api/v1/activities/{record.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    list_response = client.get("/api/v1/activities/")
    assert list_response.data["count"] == 0

    trashed_response = client.get("/api/v1/activities/?deleted=true")
    assert trashed_response.data["count"] == 1


def test_steps_must_not_exceed_max():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, steps=200001)
    response = client.post("/api/v1/activities/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "steps" in response.data["field_errors"]


def test_source_must_be_valid_enum():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, source="unknown_source")
    response = client.post("/api/v1/activities/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "source" in response.data["field_errors"]


def test_filter_by_source():
    user = UserFactory()
    ActivityFactory(user=user, source="manual", date="2026-07-19")
    ActivityFactory(user=user, source="apple_health", date="2026-07-20")
    client = _authed_client(user)

    response = client.get("/api/v1/activities/?source=apple_health")

    assert response.data["count"] == 1
    assert response.data["results"][0]["source"] == "apple_health"


def test_ordering_by_date():
    user = UserFactory()
    ActivityFactory(user=user, date="2026-07-22")
    ActivityFactory(user=user, date="2026-07-18")
    client = _authed_client(user)

    response = client.get("/api/v1/activities/?ordering=date")

    dates = [row["date"] for row in response.data["results"]]
    assert dates == sorted(dates)


def test_requires_authentication():
    client = APIClient()
    response = client.get("/api/v1/activities/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
