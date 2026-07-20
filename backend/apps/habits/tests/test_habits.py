"""Tests for the `habits` resource: CRUD, owner scoping, soft delete,
archive action, and key validation rules."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.habits.models import Habit
from apps.habits.tests.factories import HabitFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestHabitCRUD:
    def test_create_habit(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Drink Water",
            "icon": "💧",
            "type": "count",
            "unit": "cups",
            "target_value": 8,
            "increment": 1,
            "schedule": {"type": "daily"},
            "archived": False,
            "sort_order": 1,
        }
        response = client.post("/api/v1/habits/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert response.data["name"] == "Drink Water"
        assert "id" in response.data

    def test_list_habits_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        HabitFactory(user=user)
        HabitFactory(user=other)
        client = authed_client(user)
        response = client.get("/api/v1/habits/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert "results" in response.data

    def test_retrieve_other_users_habit_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        habit = HabitFactory(user=owner)
        client = authed_client(intruder)
        response = client.get(f"/api/v1/habits/{habit.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_other_users_habit_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        habit = HabitFactory(user=owner)
        client = authed_client(intruder)
        response = client.patch(f"/api/v1/habits/{habit.id}/", {"name": "hacked"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_increments_version(self):
        user = UserFactory()
        habit = HabitFactory(user=user, name="Original")
        client = authed_client(user)
        response = client.patch(f"/api/v1/habits/{habit.id}/", {"name": "Renamed"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Renamed"
        assert response.data["version"] == 2

    def test_destroy_soft_deletes_and_excludes_from_default_list(self):
        user = UserFactory()
        habit = HabitFactory(user=user)
        client = authed_client(user)

        response = client.delete(f"/api/v1/habits/{habit.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        habit.refresh_from_db()
        assert habit.deleted is True
        assert habit.version == 2

        list_response = client.get("/api/v1/habits/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/habits/?deleted=true")
        assert list_with_deleted.data["count"] == 1

    def test_archive_action_toggles_archived_and_bumps_version(self):
        user = UserFactory()
        habit = HabitFactory(user=user, archived=False)
        client = authed_client(user)

        response = client.post(f"/api/v1/habits/{habit.id}/archive/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["archived"] is True
        assert response.data["version"] == 2

        response2 = client.post(f"/api/v1/habits/{habit.id}/archive/")
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["archived"] is False
        assert response2.data["version"] == 3

    def test_archive_other_users_habit_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        habit = HabitFactory(user=owner)
        client = authed_client(intruder)
        response = client.post(f"/api/v1/habits/{habit.id}/archive/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestHabitValidation:
    def test_boolean_type_target_value_must_be_one(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Meditate",
            "icon": "🧘",
            "type": "boolean",
            "target_value": 5,
            "increment": 1,
            "schedule": {"type": "daily"},
            "archived": False,
            "sort_order": 1,
        }
        response = client.post("/api/v1/habits/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "target_value" in response.data["field_errors"]

    def test_icon_must_be_1_to_4_chars(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Too long icon",
            "icon": "abcdef",
            "type": "boolean",
            "target_value": 1,
            "increment": 1,
            "schedule": {"type": "daily"},
            "archived": False,
            "sort_order": 1,
        }
        response = client.post("/api/v1/habits/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "icon" in response.data["field_errors"]

    def test_weekly_days_schedule_requires_days(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Gym",
            "icon": "🏋️",
            "type": "boolean",
            "target_value": 1,
            "increment": 1,
            "schedule": {"type": "weekly-days"},
            "archived": False,
            "sort_order": 1,
        }
        response = client.post("/api/v1/habits/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "schedule" in response.data["field_errors"]

    def test_every_n_days_n_out_of_range_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Water plants",
            "icon": "🌱",
            "type": "boolean",
            "target_value": 1,
            "increment": 1,
            "schedule": {"type": "every-n-days", "n": 1},
            "archived": False,
            "sort_order": 1,
        }
        response = client.post("/api/v1/habits/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "schedule" in response.data["field_errors"]


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected():
    client = APIClient()
    response = client.get("/api/v1/habits/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_habit_persists_client_supplied_uuid():
    user = UserFactory()
    client = authed_client(user)
    import uuid

    client_id = str(uuid.uuid4())
    payload = {
        "id": client_id,
        "name": "Read",
        "icon": "📖",
        "type": "boolean",
        "target_value": 1,
        "increment": 1,
        "schedule": {"type": "daily"},
        "archived": False,
        "sort_order": 1,
    }
    response = client.post("/api/v1/habits/", payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["id"] == client_id
    assert Habit.objects.filter(id=client_id, user=user).exists()
