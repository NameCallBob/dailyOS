"""Tests for `medication_logs`: CRUD, owner scoping, soft delete, and the
quantity-defaults-to-dose / taken_at-defaults-when-taken rules."""

import uuid

import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.meds.tests.factories import (
    MedicationFactory,
    MedicationLogFactory,
    MedicationScheduleFactory,
    UserFactory,
)


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestMedicationLogCRUD:
    def test_create_log_defaults_quantity_to_medication_dose(self):
        user = UserFactory()
        medication = MedicationFactory(user=user, dose=250)
        client = authed_client(user)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "scheduled_for": timezone.now().isoformat(),
            "status": "taken",
        }
        response = client.post("/api/v1/medication_logs/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["quantity"] == "250.00"
        assert response.data["taken_at"] is not None

    def test_create_log_with_explicit_quantity(self):
        user = UserFactory()
        medication = MedicationFactory(user=user, dose=250)
        client = authed_client(user)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "scheduled_for": timezone.now().isoformat(),
            "status": "missed",
            "quantity": 100,
        }
        response = client.post("/api/v1/medication_logs/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["quantity"] == "100.00"

    def test_create_log_against_another_users_medication_rejected(self):
        owner = UserFactory()
        intruder = UserFactory()
        medication = MedicationFactory(user=owner)
        client = authed_client(intruder)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "scheduled_for": timezone.now().isoformat(),
            "status": "taken",
        }
        response = client.post("/api/v1/medication_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "medication_id" in response.data["field_errors"]

    def test_create_log_with_unknown_medication_id_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "medication_id": str(uuid.uuid4()),
            "source_type": "medication",
            "scheduled_for": timezone.now().isoformat(),
            "status": "taken",
        }
        response = client.post("/api/v1/medication_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "medication_id" in response.data["field_errors"]

    def test_create_log_referencing_another_users_schedule_rejected(self):
        owner = UserFactory()
        intruder = UserFactory()
        owner_medication = MedicationFactory(user=owner)
        schedule = MedicationScheduleFactory(medication=owner_medication)
        intruder_medication = MedicationFactory(user=intruder)
        client = authed_client(intruder)
        payload = {
            "medication_id": str(intruder_medication.id),
            "source_type": "medication",
            "schedule_id": str(schedule.id),
            "scheduled_for": timezone.now().isoformat(),
            "status": "taken",
        }
        response = client.post("/api/v1/medication_logs/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "schedule_id" in response.data["field_errors"]

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        MedicationLogFactory(medication=MedicationFactory(user=user))
        MedicationLogFactory(medication=MedicationFactory(user=other))
        client = authed_client(user)
        response = client.get("/api/v1/medication_logs/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_log_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        log = MedicationLogFactory(medication=MedicationFactory(user=owner))
        client = authed_client(intruder)
        response = client.get(f"/api/v1/medication_logs/{log.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_destroy_soft_deletes(self):
        user = UserFactory()
        log = MedicationLogFactory(medication=MedicationFactory(user=user))
        client = authed_client(user)
        response = client.delete(f"/api/v1/medication_logs/{log.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        log.refresh_from_db()
        assert log.deleted is True
        assert log.version == 2
        assert client.get("/api/v1/medication_logs/").data["count"] == 0
        assert client.get("/api/v1/medication_logs/?deleted=true").data["count"] == 1

    def test_update_increments_version_and_does_not_touch_quantity(self):
        user = UserFactory()
        log = MedicationLogFactory(medication=MedicationFactory(user=user), quantity=5)
        client = authed_client(user)
        response = client.patch(
            f"/api/v1/medication_logs/{log.id}/", {"note": "took late"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["version"] == 2
        assert response.data["quantity"] == "5.00"

    def test_filter_by_status(self):
        user = UserFactory()
        medication = MedicationFactory(user=user)
        MedicationLogFactory(medication=medication, status="taken")
        MedicationLogFactory(medication=medication, status="missed")
        client = authed_client(user)
        response = client.get("/api/v1/medication_logs/?status=missed")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["status"] == "missed"


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected():
    client = APIClient()
    response = client.get("/api/v1/medication_logs/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
