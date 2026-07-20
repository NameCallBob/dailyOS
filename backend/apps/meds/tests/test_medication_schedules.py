"""Tests for `medication_schedules`: CRUD, owner scoping, soft delete, and
the medication_id/source_type ownership validation."""

import uuid

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.meds.tests.factories import (
    MedicationFactory,
    MedicationScheduleFactory,
    SupplementFactory,
    UserFactory,
)


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestMedicationScheduleCRUD:
    def test_create_schedule_for_medication(self):
        user = UserFactory()
        medication = MedicationFactory(user=user)
        client = authed_client(user)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "time_of_day": "09:00",
            "active": True,
        }
        response = client.post("/api/v1/medication_schedules/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["medication_id"] == str(medication.id)
        assert response.data["source_type"] == "medication"

    def test_create_schedule_for_supplement(self):
        user = UserFactory()
        supplement = SupplementFactory(user=user)
        client = authed_client(user)
        payload = {
            "medication_id": str(supplement.id),
            "source_type": "supplement",
            "time_of_day": "09:00",
            "active": True,
        }
        response = client.post("/api/v1/medication_schedules/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_create_schedule_against_another_users_medication_rejected(self):
        owner = UserFactory()
        intruder = UserFactory()
        medication = MedicationFactory(user=owner)
        client = authed_client(intruder)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "time_of_day": "09:00",
            "active": True,
        }
        response = client.post("/api/v1/medication_schedules/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "medication_id" in response.data["field_errors"]

    def test_create_schedule_with_unknown_medication_id_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "medication_id": str(uuid.uuid4()),
            "source_type": "medication",
            "time_of_day": "09:00",
            "active": True,
        }
        response = client.post("/api/v1/medication_schedules/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "medication_id" in response.data["field_errors"]

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        MedicationScheduleFactory(medication=MedicationFactory(user=user))
        MedicationScheduleFactory(medication=MedicationFactory(user=other))
        client = authed_client(user)
        response = client.get("/api/v1/medication_schedules/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_schedule_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        schedule = MedicationScheduleFactory(medication=MedicationFactory(user=owner))
        client = authed_client(intruder)
        response = client.get(f"/api/v1/medication_schedules/{schedule.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_destroy_soft_deletes(self):
        user = UserFactory()
        schedule = MedicationScheduleFactory(medication=MedicationFactory(user=user))
        client = authed_client(user)
        response = client.delete(f"/api/v1/medication_schedules/{schedule.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        schedule.refresh_from_db()
        assert schedule.deleted is True
        assert schedule.version == 2
        assert client.get("/api/v1/medication_schedules/").data["count"] == 0
        assert client.get("/api/v1/medication_schedules/?deleted=true").data["count"] == 1

    def test_invalid_time_of_day_format_rejected(self):
        user = UserFactory()
        medication = MedicationFactory(user=user)
        client = authed_client(user)
        payload = {
            "medication_id": str(medication.id),
            "source_type": "medication",
            "time_of_day": "9am",
            "active": True,
        }
        response = client.post("/api/v1/medication_schedules/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "time_of_day" in response.data["field_errors"]

    def test_filter_by_medication_id(self):
        user = UserFactory()
        med_a = MedicationFactory(user=user)
        med_b = MedicationFactory(user=user)
        MedicationScheduleFactory(medication=med_a)
        MedicationScheduleFactory(medication=med_b)
        client = authed_client(user)
        response = client.get(f"/api/v1/medication_schedules/?medication_id={med_a.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
