"""
Tests for the sleep_logs resource (contract/api-design.md §2, "sleep_logs").

Covers: CRUD, owner scoping (IDOR), soft delete, pagination envelope, and
the sleepAt/wakeAt/hours validation rules.
"""

import datetime

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.sleep.models import SleepLog
from apps.sleep.tests.factories import SleepLogFactory, UserFactory

LIST_URL = "/api/v1/sleep_logs/"


def detail_url(pk):
    return f"/api/v1/sleep_logs/{pk}/"


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _payload(**overrides):
    bedtime = timezone.now().replace(hour=22, minute=0, second=0, microsecond=0)
    sleep_at = bedtime + datetime.timedelta(minutes=30)
    wake_at = sleep_at + datetime.timedelta(hours=7)
    payload = {
        "date": str(timezone.now().date()),
        "bedtime": bedtime.isoformat(),
        "sleep_at": sleep_at.isoformat(),
        "wake_at": wake_at.isoformat(),
        "hours": "7.00",
        "awakenings": 1,
        "quality": 4,
        "morning_energy": 3,
        "pre_sleep_activity": "reading",
        "notes": "睡前看書",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestSleepLogCRUD:
    def test_create(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(LIST_URL, _payload(), format="json")

        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["quality"] == 4
        assert response.data["pre_sleep_activity"] == "reading"
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert "id" in response.data
        assert SleepLog.objects.filter(user=user).count() == 1

    def test_list_returns_paginated_envelope(self):
        user = UserFactory()
        SleepLogFactory.create_batch(3, user=user)
        client = authed_client(user)

        response = client.get(LIST_URL)

        assert response.status_code == status.HTTP_200_OK
        assert set(response.data.keys()) == {"results", "count", "next", "previous"}
        assert response.data["count"] == 3

    def test_retrieve(self):
        user = UserFactory()
        log = SleepLogFactory(user=user)
        client = authed_client(user)

        response = client.get(detail_url(log.id))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(log.id)

    def test_update_bumps_version(self):
        user = UserFactory()
        log = SleepLogFactory(user=user, quality=3)
        client = authed_client(user)

        response = client.patch(detail_url(log.id), {"quality": 5}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["quality"] == 5
        assert response.data["version"] == 2
        log.refresh_from_db()
        assert log.version == 2

    def test_soft_delete(self):
        user = UserFactory()
        log = SleepLogFactory(user=user)
        client = authed_client(user)

        response = client.delete(detail_url(log.id))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        log.refresh_from_db()
        assert log.deleted is True
        assert log.version == 2

        # Excluded from default list.
        list_response = client.get(LIST_URL)
        assert list_response.data["count"] == 0

        # Included when ?deleted=true.
        deleted_list_response = client.get(LIST_URL, {"deleted": "true"})
        assert deleted_list_response.data["count"] == 1

        # 404 on subsequent retrieve/detail access (soft-deleted, default scope).
        retrieve_response = client.get(detail_url(log.id))
        assert retrieve_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSleepLogOwnerScoping:
    def test_cannot_retrieve_other_users_log(self):
        owner = UserFactory()
        other = UserFactory()
        log = SleepLogFactory(user=owner)
        client = authed_client(other)

        response = client.get(detail_url(log.id))

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_users_log(self):
        owner = UserFactory()
        other = UserFactory()
        log = SleepLogFactory(user=owner)
        client = authed_client(other)

        response = client.patch(detail_url(log.id), {"quality": 1}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_delete_other_users_log(self):
        owner = UserFactory()
        other = UserFactory()
        log = SleepLogFactory(user=owner)
        client = authed_client(other)

        response = client.delete(detail_url(log.id))

        assert response.status_code == status.HTTP_404_NOT_FOUND
        log.refresh_from_db()
        assert log.deleted is False

    def test_list_only_returns_own_logs(self):
        owner = UserFactory()
        other = UserFactory()
        SleepLogFactory.create_batch(2, user=owner)
        SleepLogFactory.create_batch(5, user=other)
        client = authed_client(owner)

        response = client.get(LIST_URL)

        assert response.data["count"] == 2

    def test_unauthenticated_is_rejected(self):
        client = APIClient()

        response = client.get(LIST_URL)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSleepLogValidation:
    def test_sleep_at_before_bedtime_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        bedtime = timezone.now().replace(hour=23, minute=0, second=0, microsecond=0)
        sleep_at = bedtime - datetime.timedelta(minutes=10)
        wake_at = bedtime + datetime.timedelta(hours=7)

        response = client.post(
            LIST_URL,
            _payload(
                bedtime=bedtime.isoformat(),
                sleep_at=sleep_at.isoformat(),
                wake_at=wake_at.isoformat(),
                hours="7.17",
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sleep_at" in response.data["field_errors"]

    def test_wake_at_before_sleep_at_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        bedtime = timezone.now().replace(hour=22, minute=0, second=0, microsecond=0)
        sleep_at = bedtime + datetime.timedelta(minutes=10)
        wake_at = sleep_at - datetime.timedelta(minutes=5)

        response = client.post(
            LIST_URL,
            _payload(
                bedtime=bedtime.isoformat(),
                sleep_at=sleep_at.isoformat(),
                wake_at=wake_at.isoformat(),
                hours="0.10",
            ),
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "wake_at" in response.data["field_errors"]

    def test_hours_inconsistent_with_sleep_wake_span_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(
            LIST_URL,
            _payload(hours="2.00"),  # actual span in _payload is 7h
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "hours" in response.data["field_errors"]

    def test_hours_out_of_range_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(LIST_URL, _payload(hours="25.00"), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "hours" in response.data["field_errors"]

    def test_quality_out_of_range_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(LIST_URL, _payload(quality=6), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "quality" in response.data["field_errors"]

    def test_awakenings_out_of_range_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(LIST_URL, _payload(awakenings=21), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "awakenings" in response.data["field_errors"]

    def test_invalid_pre_sleep_activity_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(
            LIST_URL, _payload(pre_sleep_activity="not-a-real-enum"), format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "pre_sleep_activity" in response.data["field_errors"]

    def test_notes_too_long_is_rejected(self):
        user = UserFactory()
        client = authed_client(user)

        response = client.post(LIST_URL, _payload(notes="x" * 501), format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "notes" in response.data["field_errors"]

    def test_default_pre_sleep_activity_is_none(self):
        user = UserFactory()
        client = authed_client(user)
        payload = _payload()
        payload.pop("pre_sleep_activity")

        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["pre_sleep_activity"] == "none"
