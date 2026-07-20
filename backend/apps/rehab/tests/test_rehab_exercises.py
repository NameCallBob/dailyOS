"""Tests for the `rehab_exercises` resource: CRUD, owner scoping, soft
delete, and the sets/reps/duration_sec range validation."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.rehab.tests.factories import (
    RehabExerciseFactory,
    RehabPlanFactory,
    UserFactory,
)


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestRehabExerciseCRUD:
    def test_create_rehab_exercise(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "name": "直膝抬腿",
            "instructions": "平躺，膝蓋打直後抬腿",
            "sets": 3,
            "reps": 15,
            "duration_sec": 0,
            "effective_date": "2026-01-05",
            "order": 1,
        }
        response = client.post("/api/v1/rehab_exercises/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1
        assert str(response.data["rehab_plan_id"]) == str(plan.id)

    def test_create_with_other_users_plan_id_rejected(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        client = authed_client(intruder)
        payload = {
            "rehab_plan_id": str(plan.id),
            "name": "偷渡項目",
            "effective_date": "2026-01-05",
        }
        response = client.post("/api/v1/rehab_exercises/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "rehab_plan_id" in response.data["field_errors"]

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        RehabExerciseFactory(rehab_plan=RehabPlanFactory(user=user))
        RehabExerciseFactory(rehab_plan=RehabPlanFactory(user=other))
        client = authed_client(user)
        response = client.get("/api/v1/rehab_exercises/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_exercise_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        exercise = RehabExerciseFactory(rehab_plan=RehabPlanFactory(user=owner))
        client = authed_client(intruder)
        response = client.get(f"/api/v1/rehab_exercises/{exercise.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_increments_version(self):
        user = UserFactory()
        exercise = RehabExerciseFactory(rehab_plan=RehabPlanFactory(user=user), sets=3)
        client = authed_client(user)
        response = client.patch(
            f"/api/v1/rehab_exercises/{exercise.id}/", {"sets": 5}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["sets"] == 5
        assert response.data["version"] == 2

    def test_destroy_soft_deletes_and_excludes_from_default_list(self):
        user = UserFactory()
        exercise = RehabExerciseFactory(rehab_plan=RehabPlanFactory(user=user))
        client = authed_client(user)

        response = client.delete(f"/api/v1/rehab_exercises/{exercise.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        exercise.refresh_from_db()
        assert exercise.deleted is True

        list_response = client.get("/api/v1/rehab_exercises/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/rehab_exercises/?deleted=true")
        assert list_with_deleted.data["count"] == 1


@pytest.mark.django_db
class TestRehabExerciseValidation:
    def test_sets_over_max_rejected(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "name": "過量項目",
            "sets": 51,
            "effective_date": "2026-01-05",
        }
        response = client.post("/api/v1/rehab_exercises/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "sets" in response.data["field_errors"]

    def test_duration_sec_over_max_rejected(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "name": "過久項目",
            "duration_sec": 7201,
            "effective_date": "2026-01-05",
        }
        response = client.post("/api/v1/rehab_exercises/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "duration_sec" in response.data["field_errors"]

    def test_reps_negative_rejected(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "name": "負數項目",
            "reps": -1,
            "effective_date": "2026-01-05",
        }
        response = client.post("/api/v1/rehab_exercises/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "reps" in response.data["field_errors"]
