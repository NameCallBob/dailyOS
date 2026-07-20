import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.calendar.models import CalendarEvent
from apps.calendar.tests.factories import CalendarEventFactory, UserFactory

LIST_URL = "/api/v1/calendar_events/"


def _detail_url(event_id):
    return f"{LIST_URL}{event_id}/"


def _authed_client(user=None):
    user = user or UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestCalendarEventsCRUD:
    def test_create_event(self):
        client, _user = _authed_client()
        payload = {
            "title": "Kickoff meeting",
            "description": "Quarterly planning",
            "start_at": "2026-07-21T01:00:00Z",
            "end_at": "2026-07-21T02:00:00Z",
            "all_day": False,
            "tz": "Asia/Taipei",
            "type": "meeting",
            "location": "HQ",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        data = response.data
        assert data["title"] == "Kickoff meeting"
        assert data["version"] == 1
        assert data["deleted"] is False
        assert uuid.UUID(data["id"])
        assert "created_at" in data and "updated_at" in data

    def test_list_events_paginated_envelope(self):
        client, user = _authed_client()
        CalendarEventFactory.create_batch(3, user=user)
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert set(response.data.keys()) == {"results", "count", "next", "previous"}
        assert response.data["count"] == 3

    def test_retrieve_event(self):
        client, user = _authed_client()
        event = CalendarEventFactory(user=user)
        response = client.get(_detail_url(event.id))
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(event.id)

    def test_patch_event_bumps_version(self):
        client, user = _authed_client()
        event = CalendarEventFactory(user=user)
        response = client.patch(_detail_url(event.id), {"title": "Updated title"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated title"
        assert response.data["version"] == event.version + 1

    def test_soft_delete_event(self):
        client, user = _authed_client()
        event = CalendarEventFactory(user=user)
        response = client.delete(_detail_url(event.id))
        assert response.status_code == status.HTTP_204_NO_CONTENT

        event.refresh_from_db()
        assert event.deleted is True
        assert event.version == 2

        # Excluded from default list.
        list_response = client.get(LIST_URL)
        assert list_response.data["count"] == 0

        # Included when ?deleted=true.
        list_deleted_response = client.get(LIST_URL, {"deleted": "true"})
        assert list_deleted_response.data["count"] == 1

        # 404 on retrieve without ?deleted=true (OwnedModelViewSet.get_queryset
        # default excludes soft-deleted rows).
        detail_response = client.get(_detail_url(event.id))
        assert detail_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestOwnerScoping:
    def test_cannot_retrieve_other_users_event(self):
        owner = UserFactory()
        event = CalendarEventFactory(user=owner)
        attacker_client, _attacker = _authed_client()

        response = attacker_client.get(_detail_url(event.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_users_event(self):
        owner = UserFactory()
        event = CalendarEventFactory(user=owner)
        attacker_client, _attacker = _authed_client()

        response = attacker_client.patch(
            _detail_url(event.id), {"title": "hijacked"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        event.refresh_from_db()
        assert event.title != "hijacked"

    def test_cannot_delete_other_users_event(self):
        owner = UserFactory()
        event = CalendarEventFactory(user=owner)
        attacker_client, _attacker = _authed_client()

        response = attacker_client.delete(_detail_url(event.id))
        assert response.status_code == status.HTTP_404_NOT_FOUND
        event.refresh_from_db()
        assert event.deleted is False

    def test_list_only_returns_own_events(self):
        client, user = _authed_client()
        CalendarEventFactory.create_batch(2, user=user)
        other_user = UserFactory()
        CalendarEventFactory.create_batch(5, user=other_user)

        response = client.get(LIST_URL)
        assert response.data["count"] == 2

    def test_unauthenticated_request_rejected(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestValidation:
    def _base_payload(self, **overrides):
        payload = {
            "title": "Standup",
            "start_at": "2026-07-21T01:00:00Z",
            "end_at": "2026-07-21T02:00:00Z",
            "all_day": False,
            "tz": "Asia/Taipei",
            "type": "meeting",
        }
        payload.update(overrides)
        return payload

    def test_missing_required_field_returns_standard_error_envelope(self):
        client, _user = _authed_client()
        payload = self._base_payload()
        del payload["title"]
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "title" in response.data["field_errors"]
        assert "request_id" in response.data

    def test_end_before_start_rejected(self):
        client, _user = _authed_client()
        payload = self._base_payload(start_at="2026-07-21T05:00:00Z", end_at="2026-07-21T04:00:00Z")
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "end_at" in response.data["field_errors"]

    def test_invalid_timezone_rejected(self):
        client, _user = _authed_client()
        payload = self._base_payload(tz="Not/A_Real_Zone")
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tz" in response.data["field_errors"]

    def test_invalid_type_enum_rejected(self):
        client, _user = _authed_client()
        payload = self._base_payload(type="not_a_type")
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "type" in response.data["field_errors"]

    def test_valid_recurrence_rule_accepted(self):
        client, _user = _authed_client()
        payload = self._base_payload(recurrence_rule="FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;COUNT=10")
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["recurrence_rule"] == "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;COUNT=10"

    def test_recurrence_rule_missing_freq_rejected(self):
        client, _user = _authed_client()
        payload = self._base_payload(recurrence_rule="INTERVAL=1")
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "recurrence_rule" in response.data["field_errors"]

    def test_recurrence_rule_count_and_until_conflict_rejected(self):
        client, _user = _authed_client()
        payload = self._base_payload(
            recurrence_rule="FREQ=DAILY;COUNT=5;UNTIL=2026-12-31T00:00:00Z"
        )
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "recurrence_rule" in response.data["field_errors"]

    def test_all_day_event_roundtrip(self):
        client, _user = _authed_client()
        payload = self._base_payload(all_day=True)
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["all_day"] is True

    def test_task_id_soft_reference_accepts_arbitrary_uuid(self):
        client, _user = _authed_client()
        payload = self._base_payload(task_id=str(uuid.uuid4()))
        response = client.post(LIST_URL, payload, format="json")
        # Soft relation: no FK integrity enforced against apps.tasks.
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["task_id"] == payload["task_id"]


@pytest.mark.django_db
def test_search_filters_by_title():
    client, user = _authed_client()
    CalendarEventFactory(user=user, title="Dentist appointment")
    CalendarEventFactory(user=user, title="Team sync")

    response = client.get(LIST_URL, {"search": "Dentist"})
    assert response.data["count"] == 1
    assert response.data["results"][0]["title"] == "Dentist appointment"


@pytest.mark.django_db
def test_ordering_by_start_at_descending():
    client, user = _authed_client()
    CalendarEventFactory(user=user, title="Earlier", start_at="2026-07-20T01:00:00Z")
    CalendarEventFactory(user=user, title="Later", start_at="2026-07-22T01:00:00Z")

    response = client.get(LIST_URL, {"ordering": "-start_at"})
    titles = [row["title"] for row in response.data["results"]]
    assert titles == ["Later", "Earlier"]


@pytest.mark.django_db
def test_exact_filter_by_type():
    client, user = _authed_client()
    CalendarEventFactory(user=user, type="meeting")
    CalendarEventFactory(user=user, type="personal")

    response = client.get(LIST_URL, {"type": "personal"})
    assert response.data["count"] == 1
    assert response.data["results"][0]["type"] == "personal"


@pytest.mark.django_db
def test_model_str_and_default_manager_excludes_deleted():
    user = UserFactory()
    event = CalendarEventFactory(user=user)
    event.deleted = True
    event.save(update_fields=["deleted"])

    assert str(event) == event.title
    assert CalendarEvent.objects.filter(id=event.id).count() == 0
    assert CalendarEvent.all_objects.filter(id=event.id).count() == 1
