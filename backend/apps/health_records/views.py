"""
health_records domain viewsets.

Contract (contract/api-design.md §2.4, Appendix A) defines no custom
actions for health_documents / appointments / activities -- standard
CRUD (list/create/retrieve/update/destroy) only.
"""

import django_filters

from apps.core.viewsets import OwnedModelViewSet
from apps.health_records.models import Activity, Appointment, HealthDocument
from apps.health_records.serializers import (
    ActivitySerializer,
    AppointmentSerializer,
    HealthDocumentSerializer,
)


class AppointmentFilter(django_filters.FilterSet):
    class Meta:
        model = Appointment
        fields = ["status", "follow_up_needed"]


class AppointmentViewSet(OwnedModelViewSet):
    queryset = Appointment.all_objects.all()
    serializer_class = AppointmentSerializer
    filterset_class = AppointmentFilter
    search_fields = ["location", "doctor", "department", "reason", "notes"]
    ordering_fields = ["created_at", "updated_at", "start_at", "status"]


class HealthDocumentFilter(django_filters.FilterSet):
    appointment_id = django_filters.UUIDFilter(field_name="appointment_id")

    class Meta:
        model = HealthDocument
        fields = ["category", "appointment_id"]


class HealthDocumentViewSet(OwnedModelViewSet):
    queryset = HealthDocument.all_objects.all()
    serializer_class = HealthDocumentSerializer
    filterset_class = HealthDocumentFilter
    search_fields = ["title", "provider", "notes"]
    ordering_fields = ["created_at", "updated_at", "date", "title"]


class ActivityFilter(django_filters.FilterSet):
    class Meta:
        model = Activity
        fields = ["source", "is_primary", "date"]


class ActivityViewSet(OwnedModelViewSet):
    queryset = Activity.all_objects.all()
    serializer_class = ActivitySerializer
    filterset_class = ActivityFilter
    search_fields = ["notes"]
    ordering_fields = ["created_at", "updated_at", "date", "occurred_at", "steps"]
