import pytest
from rest_framework import status
from rest_framework.test import APIClient

from .factories import AppointmentFactory, HealthDocumentFactory, UserFactory

pytestmark = pytest.mark.django_db


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_PAYLOAD = {
    "date": "2026-07-20",
    "category": "檢驗報告",
    "title": "血液檢查報告",
}


def test_create_health_document():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post("/api/v1/health_documents/", VALID_PAYLOAD, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["title"] == "血液檢查報告"
    assert response.data["category"] == "檢驗報告"
    assert response.data["version"] == 1
    assert response.data["deleted"] is False


def test_list_scoped_to_owner_idor_protection():
    user = UserFactory()
    other = UserFactory()
    HealthDocumentFactory(user=user)
    HealthDocumentFactory(user=other)

    client = _authed_client(user)
    response = client.get("/api/v1/health_documents/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


def test_update_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = HealthDocumentFactory(user=owner)

    client = _authed_client(intruder)
    response = client.patch(
        f"/api/v1/health_documents/{record.id}/", {"title": "hacked"}, format="json"
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_increments_version():
    user = UserFactory()
    record = HealthDocumentFactory(user=user)
    client = _authed_client(user)

    response = client.patch(
        f"/api/v1/health_documents/{record.id}/", {"title": "更新後標題"}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["version"] == record.version + 1
    assert response.data["title"] == "更新後標題"


def test_soft_delete():
    user = UserFactory()
    record = HealthDocumentFactory(user=user)
    client = _authed_client(user)

    delete_response = client.delete(f"/api/v1/health_documents/{record.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    list_response = client.get("/api/v1/health_documents/")
    assert list_response.data["count"] == 0

    trashed_response = client.get("/api/v1/health_documents/?deleted=true")
    assert trashed_response.data["count"] == 1


def test_category_must_be_valid_enum():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, category="不存在的分類")
    response = client.post("/api/v1/health_documents/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "category" in response.data["field_errors"]


def test_can_link_to_own_appointment():
    user = UserFactory()
    appointment = AppointmentFactory(user=user)
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, appointment_id=str(appointment.id))
    response = client.post("/api/v1/health_documents/", payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["appointment_id"] == str(appointment.id)


def test_cannot_link_to_other_users_appointment_idor_protection():
    user = UserFactory()
    other = UserFactory()
    other_appointment = AppointmentFactory(user=other)
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, appointment_id=str(other_appointment.id))
    response = client.post("/api/v1/health_documents/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "appointment_id" in response.data["field_errors"]


def test_search_by_title():
    user = UserFactory()
    HealthDocumentFactory(user=user, title="血液檢查報告")
    HealthDocumentFactory(user=user, title="X光影像")
    client = _authed_client(user)

    response = client.get("/api/v1/health_documents/?search=X光")

    assert response.data["count"] == 1
    assert response.data["results"][0]["title"] == "X光影像"


def test_requires_authentication():
    client = APIClient()
    response = client.get("/api/v1/health_documents/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
