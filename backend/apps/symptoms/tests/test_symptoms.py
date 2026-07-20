"""
CRUD, owner-scoping (IDOR), soft-delete and validation coverage for
symptom_defs / symptom_logs (contract/api-design.md §"symptom_defs" /
§"symptom_logs").
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.symptoms.models import SymptomDef, SymptomLog

from .factories import SymptomDefFactory, SymptomLogFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def other_user():
    return UserFactory()


# ---------------------------------------------------------------------------
# symptom_defs CRUD
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_symptom_def_create_list_retrieve(user):
    client = authed_client(user)

    create_response = client.post(
        "/api/v1/symptom_defs/",
        {"name": "偏頭痛", "category": "頭痛", "note": "壓力大時發作", "archived": False},
        format="json",
    )
    assert create_response.status_code == status.HTTP_201_CREATED, create_response.data
    body = create_response.data
    assert body["name"] == "偏頭痛"
    assert body["category"] == "頭痛"
    assert body["archived"] is False
    assert body["version"] == 1
    assert body["deleted"] is False
    assert "id" in body and "created_at" in body and "updated_at" in body

    list_response = client.get("/api/v1/symptom_defs/")
    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.data["count"] == 1
    assert list_response.data["results"][0]["id"] == body["id"]

    retrieve_response = client.get(f"/api/v1/symptom_defs/{body['id']}/")
    assert retrieve_response.status_code == status.HTTP_200_OK
    assert retrieve_response.data["name"] == "偏頭痛"


@pytest.mark.django_db
def test_symptom_def_create_requires_name_category_archived(user):
    client = authed_client(user)
    response = client.post("/api/v1/symptom_defs/", {}, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "validation_error"
    for field in ("name", "category", "archived"):
        assert field in response.data["field_errors"]


@pytest.mark.django_db
def test_symptom_def_update_bumps_version(user):
    client = authed_client(user)
    obj = SymptomDefFactory(user=user)

    response = client.patch(f"/api/v1/symptom_defs/{obj.id}/", {"archived": True}, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["archived"] is True
    assert response.data["version"] == 2

    obj.refresh_from_db()
    assert obj.version == 2
    assert obj.archived is True


@pytest.mark.django_db
def test_symptom_def_soft_delete(user):
    client = authed_client(user)
    obj = SymptomDefFactory(user=user)

    delete_response = client.delete(f"/api/v1/symptom_defs/{obj.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    obj.refresh_from_db()
    assert obj.deleted is True

    list_response = client.get("/api/v1/symptom_defs/")
    assert list_response.data["count"] == 0

    list_with_deleted = client.get("/api/v1/symptom_defs/?deleted=true")
    assert list_with_deleted.data["count"] == 1


@pytest.mark.django_db
def test_symptom_def_owner_scoping_returns_404_for_other_users_data(user, other_user):
    other_obj = SymptomDefFactory(user=other_user)
    client = authed_client(user)

    retrieve_response = client.get(f"/api/v1/symptom_defs/{other_obj.id}/")
    assert retrieve_response.status_code == status.HTTP_404_NOT_FOUND

    update_response = client.patch(
        f"/api/v1/symptom_defs/{other_obj.id}/", {"archived": True}, format="json"
    )
    assert update_response.status_code == status.HTTP_404_NOT_FOUND

    delete_response = client.delete(f"/api/v1/symptom_defs/{other_obj.id}/")
    assert delete_response.status_code == status.HTTP_404_NOT_FOUND

    list_response = client.get("/api/v1/symptom_defs/")
    assert list_response.data["count"] == 0

    other_obj.refresh_from_db()
    assert other_obj.deleted is False


# ---------------------------------------------------------------------------
# symptom_logs CRUD + validation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_symptom_log_create_and_retrieve(user):
    client = authed_client(user)
    symptom_def = SymptomDefFactory(user=user)

    response = client.post(
        "/api/v1/symptom_logs/",
        {
            "symptom_def_id": str(symptom_def.id),
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "intensity": 7,
            "body_location": "左太陽穴",
            "duration_min": 45,
            "triggers": ["熬夜", "咖啡"],
            "relief": ["休息"],
            "notes": "起床後發作",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert str(response.data["symptom_def_id"]) == str(symptom_def.id)
    assert response.data["intensity"] == "7.0"
    assert response.data["triggers"] == ["熬夜", "咖啡"]
    assert response.data["version"] == 1


@pytest.mark.django_db
def test_symptom_log_intensity_out_of_range_rejected(user):
    client = authed_client(user)
    symptom_def = SymptomDefFactory(user=user)

    response = client.post(
        "/api/v1/symptom_logs/",
        {
            "symptom_def_id": str(symptom_def.id),
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "intensity": 11,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "validation_error"
    assert "intensity" in response.data["field_errors"]


@pytest.mark.django_db
def test_symptom_log_triggers_max_items_rejected(user):
    client = authed_client(user)
    symptom_def = SymptomDefFactory(user=user)

    response = client.post(
        "/api/v1/symptom_logs/",
        {
            "symptom_def_id": str(symptom_def.id),
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "intensity": 3,
            "triggers": [f"t{i}" for i in range(11)],
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "triggers" in response.data["field_errors"]


@pytest.mark.django_db
def test_symptom_log_referencing_other_users_symptom_def_rejected(user, other_user):
    other_symptom_def = SymptomDefFactory(user=other_user)
    client = authed_client(user)

    response = client.post(
        "/api/v1/symptom_logs/",
        {
            "symptom_def_id": str(other_symptom_def.id),
            "date": "2026-07-20",
            "start_at": "2026-07-20T08:00:00Z",
            "intensity": 3,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "symptom_def_id" in response.data["field_errors"]


@pytest.mark.django_db
def test_symptom_log_soft_delete_and_owner_scoping(user, other_user):
    client = authed_client(user)
    own_def = SymptomDefFactory(user=user)
    log = SymptomLogFactory(user=user, symptom_def=own_def)

    other_def = SymptomDefFactory(user=other_user)
    other_log = SymptomLogFactory(user=other_user, symptom_def=other_def)

    # owner scoping / IDOR guard
    retrieve_other = client.get(f"/api/v1/symptom_logs/{other_log.id}/")
    assert retrieve_other.status_code == status.HTTP_404_NOT_FOUND

    # soft delete own record
    delete_response = client.delete(f"/api/v1/symptom_logs/{log.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT
    log.refresh_from_db()
    assert log.deleted is True
    assert log.version == 2

    list_response = client.get("/api/v1/symptom_logs/")
    assert list_response.data["count"] == 0

    other_log.refresh_from_db()
    assert other_log.deleted is False


@pytest.mark.django_db
def test_symptom_log_filter_by_symptom_def(user):
    client = authed_client(user)
    def_a = SymptomDefFactory(user=user)
    def_b = SymptomDefFactory(user=user)
    log_a = SymptomLogFactory(user=user, symptom_def=def_a)
    SymptomLogFactory(user=user, symptom_def=def_b)

    response = client.get(f"/api/v1/symptom_logs/?symptom_def={def_a.id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert str(response.data["results"][0]["id"]) == str(log_a.id)


@pytest.mark.django_db
def test_symptom_def_and_log_model_managers_direct(user):
    obj = SymptomDefFactory(user=user)
    obj.deleted = True
    obj.save(update_fields=["deleted"])

    assert SymptomDef.objects.filter(id=obj.id).count() == 0
    assert SymptomDef.all_objects.filter(id=obj.id).count() == 1
    assert SymptomLog.objects.count() == 0
