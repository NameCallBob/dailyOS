import pytest
from rest_framework import status
from rest_framework.test import APIClient

from .factories import AppointmentFactory, UserFactory

pytestmark = pytest.mark.django_db


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_PAYLOAD = {
    "start_at": "2026-08-01T09:00:00Z",
    "location": "台大醫院",
    "status": "scheduled",
    "follow_up_needed": False,
}


def test_create_appointment():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post("/api/v1/appointments/", VALID_PAYLOAD, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["location"] == "台大醫院"
    assert response.data["status"] == "scheduled"
    assert response.data["version"] == 1
    assert response.data["deleted"] is False


def test_list_scoped_to_owner_idor_protection():
    user = UserFactory()
    other = UserFactory()
    AppointmentFactory(user=user)
    AppointmentFactory(user=other)

    client = _authed_client(user)
    response = client.get("/api/v1/appointments/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


def test_retrieve_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = AppointmentFactory(user=owner)

    client = _authed_client(intruder)
    response = client.get(f"/api/v1/appointments/{record.id}/")

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = AppointmentFactory(user=owner)

    client = _authed_client(intruder)
    response = client.patch(
        f"/api/v1/appointments/{record.id}/", {"status": "cancelled"}, format="json"
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_increments_version():
    user = UserFactory()
    record = AppointmentFactory(user=user)
    client = _authed_client(user)

    response = client.patch(
        f"/api/v1/appointments/{record.id}/", {"status": "completed"}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["version"] == record.version + 1
    assert response.data["status"] == "completed"


def test_soft_delete():
    user = UserFactory()
    record = AppointmentFactory(user=user)
    client = _authed_client(user)

    delete_response = client.delete(f"/api/v1/appointments/{record.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    list_response = client.get("/api/v1/appointments/")
    assert list_response.data["count"] == 0

    trashed_response = client.get("/api/v1/appointments/?deleted=true")
    assert trashed_response.data["count"] == 1


def test_status_must_be_valid_enum():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, status="unknown_status")
    response = client.post("/api/v1/appointments/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "status" in response.data["field_errors"]


def test_reminder_minutes_before_must_be_within_range():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, reminder_minutes_before=10081)
    response = client.post("/api/v1/appointments/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "reminder_minutes_before" in response.data["field_errors"]


def test_search_by_location():
    user = UserFactory()
    AppointmentFactory(user=user, location="台大醫院")
    AppointmentFactory(user=user, location="長庚診所")
    client = _authed_client(user)

    response = client.get("/api/v1/appointments/?search=長庚")

    assert response.data["count"] == 1
    assert response.data["results"][0]["location"] == "長庚診所"


def test_ordering_by_start_at():
    user = UserFactory()
    AppointmentFactory(user=user, start_at="2026-08-05T09:00:00Z")
    AppointmentFactory(user=user, start_at="2026-08-01T09:00:00Z")
    client = _authed_client(user)

    response = client.get("/api/v1/appointments/?ordering=start_at")

    dates = [row["start_at"] for row in response.data["results"]]
    assert dates == sorted(dates)


def test_requires_authentication():
    client = APIClient()
    response = client.get("/api/v1/appointments/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
