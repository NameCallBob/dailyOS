"""Tests for the `medications` resource: CRUD, owner scoping, soft delete,
toggle-active action, and key validation rules."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.meds.models import Medication
from apps.meds.tests.factories import MedicationFactory, UserFactory


def authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestMedicationCRUD:
    def test_create_medication(self):
        user = UserFactory()
        client = authed_client(user)
        payload = {
            "name": "Ibuprofen",
            "dose": 200,
            "unit": "mg",
            "frequency": "daily",
            "times": ["08:00", "20:00"],
            "start_date": "2026-07-01",
            "with_food": "with_food",
            "active": True,
        }
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert response.data["name"] == "Ibuprofen"

    def test_list_scoped_to_owner(self):
        user = UserFactory()
        other = UserFactory()
        MedicationFactory(user=user)
        MedicationFactory(user=other)
        client = authed_client(user)
        response = client.get("/api/v1/medications/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

    def test_retrieve_other_users_medication_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        medication = MedicationFactory(user=owner)
        client = authed_client(intruder)
        response = client.get(f"/api/v1/medications/{medication.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_other_users_medication_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        medication = MedicationFactory(user=owner)
        client = authed_client(intruder)
        response = client.patch(
            f"/api/v1/medications/{medication.id}/", {"name": "hacked"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_increments_version(self):
        user = UserFactory()
        medication = MedicationFactory(user=user, name="Original")
        client = authed_client(user)
        response = client.patch(
            f"/api/v1/medications/{medication.id}/", {"name": "Renamed"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Renamed"
        assert response.data["version"] == 2

    def test_destroy_soft_deletes_and_excludes_from_default_list(self):
        user = UserFactory()
        medication = MedicationFactory(user=user)
        client = authed_client(user)

        response = client.delete(f"/api/v1/medications/{medication.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        medication.refresh_from_db()
        assert medication.deleted is True
        assert medication.version == 2

        list_response = client.get("/api/v1/medications/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/medications/?deleted=true")
        assert list_with_deleted.data["count"] == 1

    def test_toggle_active_action_flips_active_and_bumps_version(self):
        user = UserFactory()
        medication = MedicationFactory(user=user, active=True)
        client = authed_client(user)

        response = client.post(f"/api/v1/medications/{medication.id}/toggle-active/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["active"] is False
        assert response.data["version"] == 2

        response2 = client.post(f"/api/v1/medications/{medication.id}/toggle-active/")
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["active"] is True
        assert response2.data["version"] == 3

    def test_toggle_active_other_users_medication_returns_404(self):
        owner = UserFactory()
        intruder = UserFactory()
        medication = MedicationFactory(user=owner)
        client = authed_client(intruder)
        response = client.post(f"/api/v1/medications/{medication.id}/toggle-active/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_medication_persists_client_supplied_uuid(self):
        user = UserFactory()
        client = authed_client(user)
        import uuid

        client_id = str(uuid.uuid4())
        payload = {
            "id": client_id,
            "name": "Aspirin",
            "dose": 100,
            "unit": "mg",
            "frequency": "daily",
            "times": ["08:00"],
            "start_date": "2026-07-01",
            "with_food": "either",
            "active": True,
        }
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["id"] == client_id
        assert Medication.objects.filter(id=client_id, user=user).exists()


@pytest.mark.django_db
class TestMedicationValidation:
    def _base_payload(self, **overrides):
        payload = {
            "name": "Test Med",
            "dose": 10,
            "unit": "mg",
            "frequency": "daily",
            "times": ["08:00"],
            "start_date": "2026-07-01",
            "with_food": "either",
            "active": True,
        }
        payload.update(overrides)
        return payload

    def test_specific_days_requires_days_of_week(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(frequency="specific-days", days_of_week=[])
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "days_of_week" in response.data["field_errors"]

    def test_every_n_days_requires_interval_days(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(frequency="every-n-days")
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "interval_days" in response.data["field_errors"]

    def test_interval_days_out_of_range_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(frequency="every-n-days", interval_days=1)
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "interval_days" in response.data["field_errors"]

    def test_non_as_needed_requires_non_empty_times(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(times=[])
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "times" in response.data["field_errors"]

    def test_as_needed_allows_empty_times(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(frequency="as-needed", times=[])
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data

    def test_invalid_time_format_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(times=["8:00"])
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "times" in response.data["field_errors"]

    def test_negative_dose_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(dose=-1)
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "dose" in response.data["field_errors"]

    def test_end_date_before_start_date_rejected(self):
        user = UserFactory()
        client = authed_client(user)
        payload = self._base_payload(start_date="2026-07-10", end_date="2026-07-01")
        response = client.post("/api/v1/medications/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in response.data["field_errors"]


@pytest.mark.django_db
def test_unauthenticated_request_is_rejected():
    client = APIClient()
    response = client.get("/api/v1/medications/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
