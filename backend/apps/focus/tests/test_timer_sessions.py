"""
apps.focus.timer_sessions tests: CRUD, owner scoping (IDOR), soft delete,
single-active-session business rule, and pause/resume/stop/cancel actions.
"""

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.focus.models import TimerSession

from .factories import TimerSessionFactory, UserFactory


def _authed_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


@pytest.mark.django_db
def test_create_timer_session():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post(
        "/api/v1/timer_sessions/",
        {
            "label": "Deep work block",
            "category": "deep_work",
            "status": "running",
            "session_start_at": timezone.now().isoformat(),
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["label"] == "Deep work block"
    assert response.data["status"] == "running"
    assert response.data["version"] == 1
    assert response.data["deleted"] is False
    assert "id" in response.data


@pytest.mark.django_db
def test_only_one_active_session_allowed():
    user = UserFactory()
    client = _authed_client(user)
    TimerSessionFactory(user=user, status="running")

    response = client.post(
        "/api/v1/timer_sessions/",
        {
            "label": "Second session",
            "status": "running",
            "session_start_at": timezone.now().isoformat(),
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "validation_error"
    assert "status" in response.data["field_errors"]


@pytest.mark.django_db
def test_completed_session_does_not_block_new_active_session():
    user = UserFactory()
    client = _authed_client(user)
    TimerSessionFactory(user=user, status="completed")

    response = client.post(
        "/api/v1/timer_sessions/",
        {
            "label": "New session",
            "status": "running",
            "session_start_at": timezone.now().isoformat(),
        },
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED, response.data


@pytest.mark.django_db
def test_list_excludes_soft_deleted_by_default():
    user = UserFactory()
    client = _authed_client(user)
    TimerSessionFactory(user=user, status="completed", label="alive")
    TimerSessionFactory(user=user, status="completed", label="dead", deleted=True)

    response = client.get("/api/v1/timer_sessions/")

    assert response.status_code == status.HTTP_200_OK
    labels = [row["label"] for row in response.data["results"]]
    assert "alive" in labels
    assert "dead" not in labels

    response_with_deleted = client.get("/api/v1/timer_sessions/?deleted=true")
    labels_with_deleted = [row["label"] for row in response_with_deleted.data["results"]]
    assert "dead" in labels_with_deleted


@pytest.mark.django_db
def test_destroy_soft_deletes_and_bumps_version():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="completed")

    response = client.delete(f"/api/v1/timer_sessions/{session.id}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    session.refresh_from_db()
    assert session.deleted is True
    assert session.version == 2


@pytest.mark.django_db
def test_update_bumps_version():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="completed", label="old")

    response = client.patch(
        f"/api/v1/timer_sessions/{session.id}/", {"label": "new"}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["label"] == "new"
    assert response.data["version"] == 2


@pytest.mark.django_db
def test_owner_scoping_prevents_cross_user_access():
    owner = UserFactory()
    intruder = UserFactory()
    session = TimerSessionFactory(user=owner)
    client = _authed_client(intruder)

    detail_response = client.get(f"/api/v1/timer_sessions/{session.id}/")
    assert detail_response.status_code == status.HTTP_404_NOT_FOUND

    list_response = client.get("/api/v1/timer_sessions/")
    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.data["count"] == 0

    delete_response = client.delete(f"/api/v1/timer_sessions/{session.id}/")
    assert delete_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_pause_running_session_accumulates_seconds():
    user = UserFactory()
    client = _authed_client(user)
    started = timezone.now() - timezone.timedelta(seconds=90)
    session = TimerSessionFactory(
        user=user, status="running", started_at=started, accumulated_seconds=10
    )

    response = client.post(f"/api/v1/timer_sessions/{session.id}/pause/")

    assert response.status_code == status.HTTP_200_OK, response.data
    assert response.data["status"] == "paused"
    assert response.data["started_at"] is None
    assert response.data["accumulated_seconds"] >= 100
    assert response.data["version"] == 2


@pytest.mark.django_db
def test_pause_non_running_session_rejected():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="paused")

    response = client.post(f"/api/v1/timer_sessions/{session.id}/pause/")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "validation_error"


@pytest.mark.django_db
def test_resume_paused_session():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(
        user=user, status="paused", started_at=None, paused_at=timezone.now()
    )

    response = client.post(f"/api/v1/timer_sessions/{session.id}/resume/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "running"
    assert response.data["started_at"] is not None
    assert response.data["paused_at"] is None


@pytest.mark.django_db
def test_stop_running_session_completes_and_sets_timestamps():
    user = UserFactory()
    client = _authed_client(user)
    started = timezone.now() - timezone.timedelta(seconds=30)
    session = TimerSessionFactory(user=user, status="running", started_at=started)

    response = client.post(f"/api/v1/timer_sessions/{session.id}/stop/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "completed"
    assert response.data["started_at"] is None
    assert response.data["completed_at"] is not None
    assert response.data["accumulated_seconds"] >= 30


@pytest.mark.django_db
def test_cancel_paused_session():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="paused", started_at=None)

    response = client.post(f"/api/v1/timer_sessions/{session.id}/cancel/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "cancelled"
    assert response.data["completed_at"] is not None


@pytest.mark.django_db
def test_cancel_completed_session_rejected():
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(user=user, status="completed")

    response = client.post(f"/api/v1/timer_sessions/{session.id}/cancel/")

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_target_seconds_must_be_positive():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post(
        "/api/v1/timer_sessions/",
        {
            "label": "Pomodoro",
            "status": "running",
            "mode": "pomodoro",
            "target_seconds": 0,
            "session_start_at": timezone.now().isoformat(),
        },
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "target_seconds" in response.data["field_errors"]


@pytest.mark.django_db
def test_resume_action_does_not_trip_active_session_conflict():
    """Resuming the session that is itself the active one must not be
    rejected by the 'only one active session' rule."""
    user = UserFactory()
    client = _authed_client(user)
    session = TimerSessionFactory(
        user=user, status="paused", started_at=None, paused_at=timezone.now()
    )

    response = client.post(f"/api/v1/timer_sessions/{session.id}/resume/")

    assert response.status_code == status.HTTP_200_OK
    assert TimerSession.all_objects.filter(user=user, status="running").count() == 1
