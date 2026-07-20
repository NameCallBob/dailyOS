"""
Tests for the meal_logs resource (contract/api-design.md §2 -- meal_logs).

Covers: CRUD, owner scoping (IDOR guard), soft delete, list filtering by
`deleted`, and field-level validation (nutrient bounds, required fields).
"""

import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.nutrition.models import MealLog
from apps.nutrition.tests.factories import MealLogFactory, UserFactory


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def other_user():
    return UserFactory()


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


@pytest.fixture
def other_client(other_user):
    api = APIClient()
    api.force_authenticate(user=other_user)
    return api


def meal_payload(**overrides):
    payload = {
        "date": "2026-07-20",
        "logged_at": "2026-07-20T12:00:00Z",
        "type": "lunch",
        "text": "雞胸肉便當",
        "food_tags": ["chicken", "rice"],
        "portion": "1 份",
        "calories": 650,
        "protein": 45.5,
        "notes": "外食",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestMealLogCRUD:
    def test_create(self, client):
        response = client.post("/api/v1/meal_logs/", meal_payload(), format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["type"] == "lunch"
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert response.data["food_tags"] == ["chicken", "rice"]
        assert "id" in response.data and "created_at" in response.data

    def test_list_returns_paginated_envelope(self, client, user):
        MealLogFactory.create_batch(3, user=user)
        response = client.get("/api/v1/meal_logs/")
        assert response.status_code == status.HTTP_200_OK
        assert set(response.data.keys()) == {"results", "count", "next", "previous"}
        assert response.data["count"] == 3

    def test_retrieve(self, client, user):
        meal = MealLogFactory(user=user)
        response = client.get(f"/api/v1/meal_logs/{meal.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(meal.id)

    def test_update_bumps_version(self, client, user):
        meal = MealLogFactory(user=user, text="original")
        response = client.patch(f"/api/v1/meal_logs/{meal.id}/", {"text": "updated"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["text"] == "updated"
        assert response.data["version"] == 2

    def test_destroy_is_soft_delete(self, client, user):
        meal = MealLogFactory(user=user)
        response = client.delete(f"/api/v1/meal_logs/{meal.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        meal.refresh_from_db()
        assert meal.deleted is True
        assert meal.version == 2

        # Excluded from default list.
        list_response = client.get("/api/v1/meal_logs/")
        assert list_response.data["count"] == 0

        # Included when ?deleted=true.
        included_response = client.get("/api/v1/meal_logs/?deleted=true")
        assert included_response.data["count"] == 1

    def test_soft_deleted_record_not_retrievable_by_default(self, client, user):
        meal = MealLogFactory(user=user, deleted=True)
        response = client.get(f"/api/v1/meal_logs/{meal.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestOwnerScoping:
    def test_list_only_returns_own_records(self, client, user, other_user):
        MealLogFactory.create_batch(2, user=user)
        MealLogFactory.create_batch(5, user=other_user)
        response = client.get("/api/v1/meal_logs/")
        assert response.data["count"] == 2

    def test_retrieve_other_users_record_returns_404(self, client, other_user):
        other_meal = MealLogFactory(user=other_user)
        response = client.get(f"/api/v1/meal_logs/{other_meal.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_other_users_record_returns_404(self, client, other_user):
        other_meal = MealLogFactory(user=other_user)
        response = client.patch(
            f"/api/v1/meal_logs/{other_meal.id}/", {"text": "hacked"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        other_meal.refresh_from_db()
        assert other_meal.text != "hacked"

    def test_destroy_other_users_record_returns_404(self, client, other_user):
        other_meal = MealLogFactory(user=other_user)
        response = client.delete(f"/api/v1/meal_logs/{other_meal.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        other_meal.refresh_from_db()
        assert other_meal.deleted is False

    def test_unknown_id_returns_404(self, client):
        response = client.get(f"/api/v1/meal_logs/{uuid.uuid4()}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unauthenticated_request_returns_401(self):
        anon = APIClient()
        response = anon.get("/api/v1/meal_logs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestFiltersAndSearch:
    def test_filter_by_type(self, client, user):
        MealLogFactory(user=user, type="breakfast")
        MealLogFactory(user=user, type="dinner")
        response = client.get("/api/v1/meal_logs/?type=dinner")
        assert response.data["count"] == 1
        assert response.data["results"][0]["type"] == "dinner"

    def test_search_by_text(self, client, user):
        MealLogFactory(user=user, text="牛肉麵")
        MealLogFactory(user=user, text="沙拉")
        response = client.get("/api/v1/meal_logs/?search=牛肉")
        assert response.data["count"] == 1

    def test_ordering(self, client, user):
        MealLogFactory(user=user, text="a", date="2026-01-01", logged_at="2026-01-01T08:00:00Z")
        MealLogFactory(user=user, text="b", date="2026-06-01", logged_at="2026-06-01T08:00:00Z")
        response = client.get("/api/v1/meal_logs/?ordering=date")
        dates = [row["date"] for row in response.data["results"]]
        assert dates == sorted(dates)


@pytest.mark.django_db
class TestValidation:
    def test_missing_required_field_returns_field_errors(self, client):
        payload = meal_payload()
        del payload["text"]
        response = client.post("/api/v1/meal_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "text" in response.data["field_errors"]

    def test_calories_over_max_is_rejected(self, client):
        response = client.post("/api/v1/meal_logs/", meal_payload(calories=100001), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "calories" in response.data["field_errors"]

    def test_negative_nutrient_is_rejected(self, client):
        response = client.post("/api/v1/meal_logs/", meal_payload(protein=-1), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "protein" in response.data["field_errors"]

    def test_invalid_type_is_rejected(self, client):
        response = client.post("/api/v1/meal_logs/", meal_payload(type="brunch"), format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "type" in response.data["field_errors"]

    def test_nutrients_are_optional(self, client):
        payload = meal_payload()
        for field in ("calories", "protein", "carb", "fat", "calcium", "fiber", "water"):
            payload.pop(field, None)
        response = client.post("/api/v1/meal_logs/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["calories"] is None

    def test_custom_nutrients_round_trip(self, client):
        payload = meal_payload(
            custom_nutrients=[{"id": "n1", "label": "Omega-3", "value": 1.2, "unit": "g"}]
        )
        response = client.post("/api/v1/meal_logs/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["custom_nutrients"][0]["label"] == "Omega-3"

    def test_custom_nutrient_missing_required_key_rejected(self, client):
        payload = meal_payload(custom_nutrients=[{"id": "n1", "value": 1.2}])
        response = client.post("/api/v1/meal_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_upsert_accepts_client_supplied_id(client):
    client_id = str(uuid.uuid4())
    response = client.post("/api/v1/meal_logs/", meal_payload(id=client_id), format="json")
    assert response.status_code == status.HTTP_201_CREATED, response.data
    assert response.data["id"] == client_id
    assert MealLog.all_objects.filter(id=client_id).exists()
