"""
meds domain viewsets.

Endpoints (contract/api-design.md §2, Appendix A):
  - standard CRUD for ``medications``, ``supplements``,
    ``medication_schedules``, ``medication_logs`` via OwnedModelViewSet.
  - ``POST /api/v1/medications/{id}/toggle-active/`` -- toggles ``active``.
  - ``POST /api/v1/supplements/{id}/toggle-active/`` -- toggles ``active``.
"""

import django_filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet

from .models import Medication, MedicationLog, MedicationSchedule, Supplement
from .serializers import (
    MedicationLogSerializer,
    MedicationScheduleSerializer,
    MedicationSerializer,
    SupplementSerializer,
)

_MEDICATION_LIKE_FILTERSET_FIELDS = ["frequency", "with_food", "active"]
_MEDICATION_LIKE_SEARCH_FIELDS = ["name", "notes"]
_MEDICATION_LIKE_ORDERING_FIELDS = ["created_at", "updated_at", "name", "start_date"]


class MedicationViewSet(OwnedModelViewSet):
    queryset = Medication.all_objects.all()
    serializer_class = MedicationSerializer
    filterset_fields = _MEDICATION_LIKE_FILTERSET_FIELDS
    search_fields = _MEDICATION_LIKE_SEARCH_FIELDS
    ordering_fields = _MEDICATION_LIKE_ORDERING_FIELDS

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        instance = self.get_object()
        instance = self.bump_version_and_save(instance, active=not instance.active)
        return Response(self.get_serializer(instance).data)


class SupplementViewSet(OwnedModelViewSet):
    queryset = Supplement.all_objects.all()
    serializer_class = SupplementSerializer
    filterset_fields = _MEDICATION_LIKE_FILTERSET_FIELDS
    search_fields = _MEDICATION_LIKE_SEARCH_FIELDS
    ordering_fields = _MEDICATION_LIKE_ORDERING_FIELDS

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        instance = self.get_object()
        instance = self.bump_version_and_save(instance, active=not instance.active)
        return Response(self.get_serializer(instance).data)


class MedicationScheduleViewSet(OwnedModelViewSet):
    queryset = MedicationSchedule.all_objects.all()
    serializer_class = MedicationScheduleSerializer
    filterset_fields = ["medication_id", "source_type", "active"]
    search_fields = ["label"]
    ordering_fields = ["created_at", "updated_at", "time_of_day"]


class MedicationLogFilterSet(django_filters.FilterSet):
    # DB column is `schedule_id`; expose that name so `?schedule_id=` (the
    # contract's snake_case field name for the `scheduleId` FK) filters
    # correctly, matching the `schedule_id` output field on the serializer.
    schedule_id = django_filters.CharFilter(field_name="schedule_id")

    class Meta:
        model = MedicationLog
        fields = ["medication_id", "source_type", "schedule_id", "status"]


class MedicationLogViewSet(OwnedModelViewSet):
    queryset = MedicationLog.all_objects.all()
    serializer_class = MedicationLogSerializer
    filterset_class = MedicationLogFilterSet
    search_fields = ["note"]
    ordering_fields = ["created_at", "updated_at", "scheduled_for", "taken_at"]
