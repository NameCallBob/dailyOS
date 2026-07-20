"""
apps.tasks tests -- CRUD, owner scoping (IDOR), soft delete, custom
actions, and key validation rules (contract/api-design.md §2.1).
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.tasks.models import Task
from apps.tasks.tests.factories import ProjectFactory, TagFactory, TaskFactory, UserFactory


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
# CRUD
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_task(client):
    response = client.post("/api/v1/tasks/", {"title": "Write report"}, format="json")
    assert response.status_code == status.HTTP_201_CREATED, response.data
    data = response.data
    assert data["title"] == "Write report"
    assert data["status"] == "inbox"
    assert data["priority"] == "med"
    assert data["version"] == 1
    assert data["deleted"] is False
    assert "id" in data and "created_at" in data and "updated_at" in data


@pytest.mark.django_db
def test_list_tasks_paginated_shape(client, user):
    TaskFactory.create_batch(3, user=user)
    response = client.get("/api/v1/tasks/")
    assert response.status_code == status.HTTP_200_OK
    assert set(response.data.keys()) == {"results", "count", "next", "previous"}
    assert response.data["count"] == 3


@pytest.mark.django_db
def test_retrieve_update_task(client, user):
    task = TaskFactory(user=user, title="Old title")
    response = client.patch(f"/api/v1/tasks/{task.id}/", {"title": "New title"}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["title"] == "New title"
    assert response.data["version"] == 2

    get_response = client.get(f"/api/v1/tasks/{task.id}/")
    assert get_response.status_code == status.HTTP_200_OK
    assert get_response.data["title"] == "New title"


# --------------------------------------------------------------------------
# Owner scoping / IDOR
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_cannot_retrieve_other_users_task(client, other_user):
    foreign_task = TaskFactory(user=other_user)
    response = client.get(f"/api/v1/tasks/{foreign_task.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_cannot_update_other_users_task(client, other_user):
    foreign_task = TaskFactory(user=other_user)
    response = client.patch(
        f"/api/v1/tasks/{foreign_task.id}/", {"title": "hijacked"}, format="json"
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_list_only_returns_own_tasks(client, user, other_user):
    TaskFactory.create_batch(2, user=user)
    TaskFactory.create_batch(5, user=other_user)
    response = client.get("/api/v1/tasks/")
    assert response.data["count"] == 2


@pytest.mark.django_db
def test_cannot_assign_project_owned_by_another_user(client, other_user):
    foreign_project = ProjectFactory(user=other_user)
    response = client.post(
        "/api/v1/tasks/",
        {"title": "sneaky", "project_id": str(foreign_project.id)},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# --------------------------------------------------------------------------
# Soft delete
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_destroy_is_soft_delete(client, user):
    task = TaskFactory(user=user)
    response = client.delete(f"/api/v1/tasks/{task.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT

    task.refresh_from_db()
    assert task.deleted is True
    assert task.version == 2

    list_response = client.get("/api/v1/tasks/")
    assert list_response.data["count"] == 0

    with_deleted = client.get("/api/v1/tasks/?deleted=true")
    assert with_deleted.data["count"] == 1


# --------------------------------------------------------------------------
# Custom actions
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_complete_and_uncomplete_actions(client, user):
    task = TaskFactory(user=user, status=Task.Status.PLANNED)

    complete_response = client.post(f"/api/v1/tasks/{task.id}/complete/")
    assert complete_response.status_code == status.HTTP_200_OK
    assert complete_response.data["status"] == "completed"
    assert complete_response.data["completed_at"] is not None
    assert complete_response.data["version"] == 2

    uncomplete_response = client.post(f"/api/v1/tasks/{task.id}/uncomplete/")
    assert uncomplete_response.status_code == status.HTTP_200_OK
    assert uncomplete_response.data["status"] == "planned"
    assert uncomplete_response.data["completed_at"] is None
    assert uncomplete_response.data["version"] == 3


@pytest.mark.django_db
def test_snooze_with_explicit_until(client, user):
    task = TaskFactory(user=user, due_date="2026-07-20")
    response = client.post(
        f"/api/v1/tasks/{task.id}/snooze/", {"until": "2026-08-01"}, format="json"
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["due_date"] == "2026-08-01"


@pytest.mark.django_db
def test_snooze_with_days_from_existing_due_date(client, user):
    task = TaskFactory(user=user, due_date="2026-07-20")
    response = client.post(f"/api/v1/tasks/{task.id}/snooze/", {"days": 5}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["due_date"] == "2026-07-25"


@pytest.mark.django_db
def test_snooze_default_one_day_when_no_body(client, user):
    task = TaskFactory(user=user, due_date="2026-07-20")
    response = client.post(f"/api/v1/tasks/{task.id}/snooze/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["due_date"] == "2026-07-21"


# --------------------------------------------------------------------------
# Validation rules
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_depends_on_rejects_self_reference(client, user):
    task = TaskFactory(user=user)
    response = client.patch(
        f"/api/v1/tasks/{task.id}/",
        {"depends_on": [str(task.id)]},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "depends_on" in response.data["field_errors"]


@pytest.mark.django_db
def test_depends_on_rejects_cycle(client, user):
    task_a = TaskFactory(user=user)
    task_b = TaskFactory(user=user)
    # a depends on b
    resp1 = client.patch(
        f"/api/v1/tasks/{task_a.id}/",
        {"depends_on": [str(task_b.id)]},
        format="json",
    )
    assert resp1.status_code == status.HTTP_200_OK

    # b depends on a -> would create a cycle a -> b -> a
    resp2 = client.patch(
        f"/api/v1/tasks/{task_b.id}/",
        {"depends_on": [str(task_a.id)]},
        format="json",
    )
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST
    assert "depends_on" in resp2.data["field_errors"]


@pytest.mark.django_db
def test_parent_rejects_self_reference(client, user):
    task = TaskFactory(user=user)
    response = client.patch(
        f"/api/v1/tasks/{task.id}/",
        {"parent_id": str(task.id)},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_parent_rejects_cycle(client, user):
    task_a = TaskFactory(user=user)
    task_b = TaskFactory(user=user, parent=task_a)

    response = client.patch(
        f"/api/v1/tasks/{task_a.id}/",
        {"parent_id": str(task_b.id)},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_title_required(client):
    response = client.post("/api/v1/tasks/", {}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "title" in response.data["field_errors"]


# --------------------------------------------------------------------------
# Projects: derived progress
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_project_progress_is_derived_from_tasks(client, user):
    project = ProjectFactory(user=user)
    TaskFactory(user=user, project=project, status=Task.Status.COMPLETED)
    TaskFactory(user=user, project=project, status=Task.Status.PLANNED)

    response = client.get(f"/api/v1/projects/{project.id}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["progress"] == 50


@pytest.mark.django_db
def test_project_progress_zero_when_no_tasks(client, user):
    project = ProjectFactory(user=user)
    response = client.get(f"/api/v1/projects/{project.id}/")
    assert response.data["progress"] == 0


@pytest.mark.django_db
def test_project_progress_ignores_write_attempt(client, user):
    project = ProjectFactory(user=user)
    response = client.patch(f"/api/v1/projects/{project.id}/", {"progress": 90}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["progress"] == 0


# --------------------------------------------------------------------------
# Tags
# --------------------------------------------------------------------------


@pytest.mark.django_db
def test_tag_crud_and_idor(client, user, other_user):
    create_response = client.post("/api/v1/tags/", {"name": "urgent"}, format="json")
    assert create_response.status_code == status.HTTP_201_CREATED
    assert create_response.data["color"] == "#6b6b6b"

    foreign_tag = TagFactory(user=other_user)
    response = client.get(f"/api/v1/tags/{foreign_tag.id}/")
    assert response.status_code == status.HTTP_404_NOT_FOUND
