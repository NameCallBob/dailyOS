"""Tests for the `habit_logs` resource: CRUD, owner scoping, soft delete,
filtering, and the one-log-per-day-per-habit rule."""

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.habits.models import HabitLog
from apps.habits.tests.factories import HabitFactory, HabitLogFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestHabitLogCRUD:
    def test_create_habit_log(self):
        user = UserFactory()
        habit = HabitFactory(user=user, type="count", target_value=8, increment=1)
        client = authed_client(user)
        payload = {
            "habit_id": str(habit.id),
            "date": "2026-07-20",
            "value": 3,
            "logged_at": timezone.now().isoformat(),
        }
        response = client.post("/api/v1/habit_logs/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert str(response.data["habit_id"]) == str(habit.id)
        assert response.data["version"] == 1

    def test_cannot_log_against_another_users_habit(self):
        owner = UserFactory()
        intruder = UserFactory()
        habit = HabitFactory(user=owner)
        client = authed_client(intruder)
        payload = {
            "habit_id": str(habit.id),
            "date": "2026-07-20",
            "value": 1,
            "logged_at": timezone.now().isoformat(),
        }
        response = client.post("/api/v1/habit_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        HabitLogFactory(habit=HabitFactory(user=user))
        HabitLogFactory(habit=HabitFactory(user=other))
        client = authed_client(user)
        response = client.get("/api/v1/habit_logs/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_log_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        log = HabitLogFactory(habit=HabitFactory(user=owner))
        client = authed_client(intruder)
        response = client.get(f"/api/v1/habit_logs/{log.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_destroy_soft_deletes(self):
        user = UserFactory()
        log = HabitLogFactory(habit=HabitFactory(user=user))
        client = authed_client(user)
        response = client.delete(f"/api/v1/habit_logs/{log.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        log.refresh_from_db()
        assert log.deleted is True
        assert log.version == 2

        assert client.get("/api/v1/habit_logs/").data["count"] == 0
        assert client.get("/api/v1/habit_logs/?deleted=true").data["count"] == 1

    def test_update_increments_version(self):
        user = UserFactory()
        log = HabitLogFactory(habit=HabitFactory(user=user), value=1)
        client = authed_client(user)
        response = client.patch(f"/api/v1/habit_logs/{log.id}/", {"value": 5}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] == "5.00"
        assert response.data["version"] == 2

    def test_filter_by_habit_id(self):
        user = UserFactory()
        habit_a = HabitFactory(user=user)
        habit_b = HabitFactory(user=user)
        HabitLogFactory(habit=habit_a)
        HabitLogFactory(habit=habit_b)
        client = authed_client(user)
        response = client.get(f"/api/v1/habit_logs/?habit_id={habit_a.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert str(response.data["results"][0]["habit_id"]) == str(habit_a.id)


@pytest.mark.django_db
class TestHabitLogValidation:
    def test_duplicate_log_for_same_habit_and_date_rejected(self):
        user = UserFactory()
        habit = HabitFactory(user=user)
        client = authed_client(user)
        payload = {
            "habit_id": str(habit.id),
            "date": "2026-07-20",
            "value": 1,
            "logged_at": timezone.now().isoformat(),
        }
        first = client.post("/api/v1/habit_logs/", payload, format="json")
        assert first.status_code == status.HTTP_201_CREATED

        second = client.post("/api/v1/habit_logs/", payload, format="json")
        assert second.status_code == status.HTTP_400_BAD_REQUEST
        assert "date" in second.data["field_errors"]
        assert HabitLog.objects.filter(habit=habit, date="2026-07-20").count() == 1

    def test_updating_same_log_does_not_trigger_duplicate_check_against_itself(self):
        user = UserFactory()
        habit = HabitFactory(user=user)
        log = HabitLogFactory(habit=habit, date="2026-07-20", value=1)
        client = authed_client(user)
        response = client.patch(f"/api/v1/habit_logs/{log.id}/", {"value": 2}, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_value_must_be_non_negative(self):
        user = UserFactory()
        habit = HabitFactory(user=user)
        client = authed_client(user)
        payload = {
            "habit_id": str(habit.id),
            "date": "2026-07-20",
            "value": -1,
            "logged_at": timezone.now().isoformat(),
        }
        response = client.post("/api/v1/habit_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "value" in response.data["field_errors"]
