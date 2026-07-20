"""Tests for the `rehab_sessions` resource: CRUD, owner scoping, soft
delete, the toggle-done action, discomfort range validation, and the
plan/exercise consistency check."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.rehab.tests.factories import (
    RehabExerciseFactory,
    RehabPlanFactory,
    RehabSessionFactory,
    UserFactory,
)


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestRehabSessionCRUD:
    def test_create_rehab_session(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        exercise = RehabExerciseFactory(rehab_plan=plan)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "rehab_exercise_id": str(exercise.id),
            "date": "2026-02-01",
            "done": True,
            "actual_sets": 3,
            "actual_reps": 12,
            "discomfort_before": 2,
            "discomfort_after": 1,
        }
        response = client.post("/api/v1/rehab_sessions/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1
        assert response.data["done"] is True

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        plan_u = RehabPlanFactory(user=user)
        RehabSessionFactory(
            rehab_plan=plan_u, rehab_exercise=RehabExerciseFactory(rehab_plan=plan_u)
        )
        plan_o = RehabPlanFactory(user=other)
        RehabSessionFactory(
            rehab_plan=plan_o, rehab_exercise=RehabExerciseFactory(rehab_plan=plan_o)
        )
        client = authed_client(user)
        response = client.get("/api/v1/rehab_sessions/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_session_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        session = RehabSessionFactory(
            rehab_plan=plan, rehab_exercise=RehabExerciseFactory(rehab_plan=plan)
        )
        client = authed_client(intruder)
        response = client.get(f"/api/v1/rehab_sessions/{session.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_increments_version(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        session = RehabSessionFactory(
            rehab_plan=plan, rehab_exercise=RehabExerciseFactory(rehab_plan=plan)
        )
        client = authed_client(user)
        response = client.patch(
            f"/api/v1/rehab_sessions/{session.id}/", {"notes": "有點緊"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["notes"] == "有點緊"
        assert response.data["version"] == 2

    def test_destroy_soft_deletes_and_excludes_from_default_list(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        session = RehabSessionFactory(
            rehab_plan=plan, rehab_exercise=RehabExerciseFactory(rehab_plan=plan)
        )
        client = authed_client(user)

        response = client.delete(f"/api/v1/rehab_sessions/{session.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        session.refresh_from_db()
        assert session.deleted is True

        list_response = client.get("/api/v1/rehab_sessions/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/rehab_sessions/?deleted=true")
        assert list_with_deleted.data["count"] == 1

    def test_toggle_done_flips_flag_without_touching_actuals(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        session = RehabSessionFactory(
            rehab_plan=plan,
            rehab_exercise=RehabExerciseFactory(rehab_plan=plan),
            done=False,
            actual_sets=3,
        )
        client = authed_client(user)

        response = client.post(f"/api/v1/rehab_sessions/{session.id}/toggle-done/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["done"] is True
        assert response.data["actual_sets"] == 3
        assert response.data["version"] == 2

    def test_toggle_done_other_users_session_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan = RehabPlanFactory(user=owner)
        session = RehabSessionFactory(
            rehab_plan=plan, rehab_exercise=RehabExerciseFactory(rehab_plan=plan)
        )
        client = authed_client(intruder)
        response = client.post(f"/api/v1/rehab_sessions/{session.id}/toggle-done/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestRehabSessionValidation:
    def test_discomfort_over_max_rejected(self):
        user = UserFactory()
        plan = RehabPlanFactory(user=user)
        exercise = RehabExerciseFactory(rehab_plan=plan)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan.id),
            "rehab_exercise_id": str(exercise.id),
            "date": "2026-02-01",
            "done": False,
            "discomfort_before": 11,
        }
        response = client.post("/api/v1/rehab_sessions/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "discomfort_before" in response.data["field_errors"]

    def test_exercise_from_other_plan_rejected(self):
        user = UserFactory()
        plan_a = RehabPlanFactory(user=user)
        plan_b = RehabPlanFactory(user=user)
        exercise_b = RehabExerciseFactory(rehab_plan=plan_b)
        client = authed_client(user)
        payload = {
            "rehab_plan_id": str(plan_a.id),
            "rehab_exercise_id": str(exercise_b.id),
            "date": "2026-02-01",
            "done": False,
        }
        response = client.post("/api/v1/rehab_sessions/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "rehab_exercise_id" in response.data["field_errors"]

    def test_exercise_from_other_user_rejected(self):
        owner = UserFactory()
        intruder = UserFactory()
        plan_owner = RehabPlanFactory(user=owner)
        exercise_owner = RehabExerciseFactory(rehab_plan=plan_owner)
        plan_intruder = RehabPlanFactory(user=intruder)
        client = authed_client(intruder)
        payload = {
            "rehab_plan_id": str(plan_intruder.id),
            "rehab_exercise_id": str(exercise_owner.id),
            "date": "2026-02-01",
            "done": False,
        }
        response = client.post("/api/v1/rehab_sessions/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "rehab_exercise_id" in response.data["field_errors"]
