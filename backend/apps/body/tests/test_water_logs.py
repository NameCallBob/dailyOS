import pytest
from rest_framework import status
from rest_framework.test import APIClient

from .factories import UserFactory, WaterLogFactory

pytestmark = pytest.mark.django_db


def _authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_PAYLOAD = {
    "date": "2026-07-20",
    "logged_at": "2026-07-20T08:00:00Z",
    "amount_ml": "250.00",
    "container_label": "bottle",
    "source": "manual",
}


def test_create_water_log():
    user = UserFactory()
    client = _authed_client(user)

    response = client.post("/api/v1/water_logs/", VALID_PAYLOAD, format="json")

    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["amount_ml"] == "250.00"
    assert response.data["version"] == 1
    assert response.data["deleted"] is False


def test_list_scoped_to_owner_idor_protection():
    user = UserFactory()
    other = UserFactory()
    WaterLogFactory(user=user)
    WaterLogFactory(user=other)

    client = _authed_client(user)
    response = client.get("/api/v1/water_logs/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


def test_update_other_users_record_returns_404():
    owner = UserFactory()
    intruder = UserFactory()
    record = WaterLogFactory(user=owner)

    client = _authed_client(intruder)
    response = client.patch(
        f"/api/v1/water_logs/{record.id}/", {"amount_ml": "300.00"}, format="json"
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_update_increments_version():
    user = UserFactory()
    record = WaterLogFactory(user=user)
    client = _authed_client(user)

    response = client.patch(
        f"/api/v1/water_logs/{record.id}/", {"amount_ml": "500.00"}, format="json"
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["version"] == record.version + 1


def test_soft_delete():
    user = UserFactory()
    record = WaterLogFactory(user=user)
    client = _authed_client(user)

    delete_response = client.delete(f"/api/v1/water_logs/{record.id}/")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    list_response = client.get("/api/v1/water_logs/")
    assert list_response.data["count"] == 0

    trashed_response = client.get("/api/v1/water_logs/?deleted=true")
    assert trashed_response.data["count"] == 1


def test_amount_ml_must_be_greater_than_zero():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, amount_ml="0")
    response = client.post("/api/v1/water_logs/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "amount_ml" in response.data["field_errors"]


def test_amount_ml_must_be_at_most_5000():
    user = UserFactory()
    client = _authed_client(user)

    payload = dict(VALID_PAYLOAD, amount_ml="5001")
    response = client.post("/api/v1/water_logs/", payload, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "amount_ml" in response.data["field_errors"]


def test_search_by_container_label():
    user = UserFactory()
    WaterLogFactory(user=user, container_label="thermos")
    WaterLogFactory(user=user, container_label="glass")
    client = _authed_client(user)

    response = client.get("/api/v1/water_logs/?search=thermos")

    assert response.data["count"] == 1
    assert response.data["results"][0]["container_label"] == "thermos"


def test_ordering_by_amount_ml():
    user = UserFactory()
    WaterLogFactory(user=user, amount_ml="100.00")
    WaterLogFactory(user=user, amount_ml="500.00")
    client = _authed_client(user)

    response = client.get("/api/v1/water_logs/?ordering=amount_ml")

    amounts = [row["amount_ml"] for row in response.data["results"]]
    assert amounts == sorted(amounts)


def test_requires_authentication():
    client = APIClient()
    response = client.get("/api/v1/water_logs/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
