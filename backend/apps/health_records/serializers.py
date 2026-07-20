"""
health_records domain serializers.

Field validation notes (see contract/api-design.md §2.4):
  - `appointment_id`: PrimaryKeyRelatedField scoped to the requesting
    user's own appointments (IDOR guard) -- referencing another user's
    appointment resolves to a normal validation error, never a leak.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.health_records.models import Activity, Appointment, HealthDocument


class AppointmentSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Appointment
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "start_at",
            "end_at",
            "doctor",
            "department",
            "location",
            "reason",
            "status",
            "reminder_minutes_before",
            "follow_up_needed",
            "notes",
        ]


class HealthDocumentSerializer(BaseModelSerializer):
    appointment_id = serializers.PrimaryKeyRelatedField(
        source="appointment",
        queryset=Appointment.all_objects.none(),
        required=False,
        allow_null=True,
    )

    class Meta(BaseModelSerializer.Meta):
        model = HealthDocument
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "category",
            "title",
            "provider",
            "file_name",
            "mime_type",
            "file_data_url",
            "file_size_kb",
            "appointment_id",
            "notes",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["appointment_id"].queryset = Appointment.all_objects.filter(user=user)


class ActivitySerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Activity
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "type",
            "occurred_at",
            "date",
            "steps",
            "walk_time_min",
            "stand_time_min",
            "active_min",
            "sedentary_min",
            "distance_km",
            "source",
            "is_primary",
            "notes",
        ]
