"""apps.focus.time_entries tests: CRUD, owner scoping, soft delete, FK link."""

import uuid

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .factories import TimeEntryFactory, TimerSessionFactory, UserFactory


def _authed_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.mark.django_db
def test_create_manual_time_entry():
    user = UserFactory()
    client = _authed_client(user)
    start = timezone.now()
    end = start + timezone.timedelta(minutes=25)

    response = client.post(
        "/api/v1/time_entries/",
        {
            "label": "Manual block",
            "category": "study",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "duration_seconds": 1500,
            "source": "manual",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["source"] == "manual"
    assert response.data["timer_session_id"] is None
    assert response.data["version"] == 1


@pytest.mark.django_db
def test_create_time_entry_linked_to_timer_session():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="completed")
    start = timezone.now()
    end = start + timezone.timedelta(minutes=10)

    response = client.post(
        "/api/v1/time_entries/",
        {
            "label": "From timer",
            "timer_session_id": str(session.id),
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "duration_seconds": 600,
            "source": "timer",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert str(response.data["timer_session_id"]) == str(session.id)


@pytest.mark.django_db
def test_cannot_link_another_users_timer_session():
    user = UserFactory()
    other = UserFactory()
    other_session = TimerSessionFactory(user=other, status="completed")
    client = _authed_client(user)

    response = client.post(
        "/api/v1/time_entries/",
        {
            "label": "Cross-user link",
            "timer_session_id": str(other_session.id),
            "start_at": timezone.now().isoformat(),
            "end_at": timezone.now().isoformat(),
            "duration_seconds": 60,
            "source": "timer",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "timer_session_id" in response.data["field_errors"]


@pytest.mark.django_db
def test_filter_by_timer_session_id():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="completed")
    TimeEntryFactory(user=user, timer_session=session, label="linked")
    TimeEntryFactory(user=user, label="unlinked")

    response = client.get(f"/api/v1/time_entries/?timer_session_id={session.id}")

    assert response.status_code == status.HTTP_200_OK
    labels = [row["label"] for row in response.data["results"]]
    assert labels == ["linked"]


@pytest.mark.django_db
def test_owner_scoping_prevents_cross_user_access():
    owner = UserFactory()
    intruder = UserFactory()
    entry = TimeEntryFactory(user=owner)
    client = _authed_client(intruder)

    response = client.get(f"/api/v1/time_entries/{entry.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_destroy_soft_deletes_and_bumps_version():
    user = UserFactory()
    client = _authed_client(user)
    entry = TimeEntryFactory(user=user)

    response = client.delete(f"/api/v1/time_entries/{entry.id}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    entry.refresh_from_db()
    assert entry.deleted is True
    assert entry.version == 2


@pytest.mark.django_db
def test_unauthenticated_request_rejected():
    client = APIClient()
    response = client.get("/api/v1/time_entries/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_nonexistent_timer_session_id_returns_field_error():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post(
        "/api/v1/time_entries/",
        {
            "label": "Bad link",
            "timer_session_id": str(uuid.uuid4()),
            "start_at": timezone.now().isoformat(),
            "end_at": timezone.now().isoformat(),
            "duration_seconds": 60,
            "source": "timer",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "timer_session_id" in response.data["field_errors"]
