"""
apps.workouts tests -- CRUD, owner scoping (IDOR), soft delete, custom
action, and key validation rules (contract/api-design.md §2 workouts 模組).
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.workouts.tests.factories import (
    ExerciseDefFactory,
    UserFactory,
    WorkoutExerciseFactory,
    WorkoutFactory,
    WorkoutSetFactory,
)


def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def other_user():
    return UserFactory()


@pytest.fixture
def client(user):
    return auth_client(user)


# --------------------------------------------------------------------------
# CRUD -- workouts
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_workout(client):
    response = client.post(
        "/api/v1/workouts/",
        {
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "type": "重訓",
            "duration_min": 45,
            "feeling": "good",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.data
    data = response.data
    assert data["type"] == "重訓"
    assert data["version"] == 1
    assert data["deleted"] is False
    assert "id" in data and "created_at" in data and "updated_at" in data


@pytest.mark.django_db
def test_list_workouts_paginated_shape(client, user):
    WorkoutFactory.create_batch(3, user=user)
    response = client.get("/api/v1/workouts/")
    assert response.status_code == status.HTTP_200_OK
    assert set(response.data.keys()) == {"results", "count", "next", "previous"}
    assert response.data["count"] == 3


@pytest.mark.django_db
def test_retrieve_update_workout(client, user):
    workout = WorkoutFactory(user=user, goal="Old goal")
    response = client.patch(f"/api/v1/workouts/{workout.id}/", {"goal": "New goal"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["goal"] == "New goal"
    assert response.data["version"] == 2

    get_response = client.get(f"/api/v1/workouts/{workout.id}/")
    assert get_response.status_code == status.HTTP_200_OK
    assert get_response.data["goal"] == "New goal"


@pytest.mark.django_db
def test_duration_min_out_of_range_rejected(client):
    response = client.post(
        "/api/v1/workouts/",
        {
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "type": "重訓",
            "duration_min": 0,
            "feeling": "good",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "duration_min" in response.data["field_errors"]


@pytest.mark.django_db
def test_rpe_out_of_range_rejected(client):
    response = client.post(
        "/api/v1/workouts/",
        {
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "type": "重訓",
            "duration_min": 30,
            "feeling": "good",
            "rpe": 11,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "rpe" in response.data["field_errors"]


@pytest.mark.django_db
def test_end_at_before_start_at_rejected(client):
    response = client.post(
        "/api/v1/workouts/",
        {
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "end_at": "2026-07-20T07:00:00Z",
            "type": "重訓",
            "duration_min": 30,
            "feeling": "good",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "end_at" in response.data["field_errors"]


# --------------------------------------------------------------------------
# Owner scoping / IDOR
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_cannot_retrieve_other_users_workout(client, other_user):
    foreign_workout = WorkoutFactory(user=other_user)
    response = client.get(f"/api/v1/workouts/{foreign_workout.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_cannot_update_other_users_workout(client, other_user):
    foreign_workout = WorkoutFactory(user=other_user)
    response = client.patch(
        f"/api/v1/workouts/{foreign_workout.id}/", {"goal": "hijacked"}, format="json"
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_list_only_returns_own_workouts(client, user, other_user):
    WorkoutFactory.create_batch(2, user=user)
    WorkoutFactory.create_batch(5, user=other_user)
    response = client.get("/api/v1/workouts/")
    assert response.data["count"] == 2


@pytest.mark.django_db
def test_cannot_assign_workout_exercise_to_workout_owned_by_another_user(client, user, other_user):
    foreign_workout = WorkoutFactory(user=other_user)
    exercise_def = ExerciseDefFactory(user=user)
    response = client.post(
        "/api/v1/workout_exercises/",
        {
            "workout_id": str(foreign_workout.id),
            "exercise_def_id": str(exercise_def.id),
            "order": 0,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_cannot_assign_workout_set_to_workout_exercise_owned_by_another_user(client, other_user):
    foreign_workout_exercise = WorkoutExerciseFactory(user=other_user)
    response = client.post(
        "/api/v1/workout_sets/",
        {"workout_exercise_id": str(foreign_workout_exercise.id), "order": 0},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# --------------------------------------------------------------------------
# Soft delete
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_destroy_is_soft_delete(client, user):
    workout = WorkoutFactory(user=user)
    response = client.delete(f"/api/v1/workouts/{workout.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    workout.refresh_from_db()
    assert workout.deleted is True
    assert workout.version == 2

    list_response = client.get("/api/v1/workouts/")
    assert list_response.data["count"] == 0

    with_deleted = client.get("/api/v1/workouts/?deleted=true")
    assert with_deleted.data["count"] == 1


# --------------------------------------------------------------------------
# workout_exercises / workout_sets CRUD + relations
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_workout_exercise_and_set(client, user):
    workout = WorkoutFactory(user=user)
    exercise_def = ExerciseDefFactory(user=user)

    we_response = client.post(
        "/api/v1/workout_exercises/",
        {"workout_id": str(workout.id), "exercise_def_id": str(exercise_def.id), "order": 0},
        format="json",
    )
    assert we_response.status_code == status.HTTP_201_CREATED, we_response.data
    workout_exercise_id = we_response.data["id"]

    set_response = client.post(
        "/api/v1/workout_sets/",
        {
            "workout_exercise_id": workout_exercise_id,
            "order": 0,
            "reps": 8,
            "weight_kg": "60.00",
        },
        format="json",
    )
    assert set_response.status_code == status.HTTP_201_CREATED, set_response.data
    assert set_response.data["is_pr"] is False


@pytest.mark.django_db
def test_filter_workout_sets_by_workout_exercise(client, user):
    we1 = WorkoutExerciseFactory(user=user)
    we2 = WorkoutExerciseFactory(user=user)
    WorkoutSetFactory.create_batch(2, user=user, workout_exercise=we1)
    WorkoutSetFactory.create_batch(3, user=user, workout_exercise=we2)

    response = client.get(f"/api/v1/workout_sets/?workout_exercise_id={we1.id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2


# --------------------------------------------------------------------------
# exercise_defs
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_exercise_def_crud_and_idor(client, user, other_user):
    create_response = client.post(
        "/api/v1/exercise_defs/",
        {"name": "Bench Press", "category": "胸部"},
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED
    assert create_response.data["is_custom"] is True

    foreign_def = ExerciseDefFactory(user=other_user)
    response = client.get(f"/api/v1/exercise_defs/{foreign_def.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


# --------------------------------------------------------------------------
# Custom action
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_toggle_pr_action(client, user):
    workout_set = WorkoutSetFactory(user=user, is_pr=False)

    response = client.post(f"/api/v1/workout_sets/{workout_set.id}/toggle-pr/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["is_pr"] is True
    assert response.data["version"] == 2

    response2 = client.post(f"/api/v1/workout_sets/{workout_set.id}/toggle-pr/")
    assert response2.status_code == status.HTTP_200_OK
    assert response2.data["is_pr"] is False
    assert response2.data["version"] == 3


@pytest.mark.django_db
def test_toggle_pr_action_idor(client, other_user):
    foreign_set = WorkoutSetFactory(user=other_user)
    response = client.post(f"/api/v1/workout_sets/{foreign_set.id}/toggle-pr/")
    assert response.status_code == status.HTTP_404_NOT_FOUND
