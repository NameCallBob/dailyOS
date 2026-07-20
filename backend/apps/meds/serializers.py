"""
meds domain serializers.

Validation rules per contract/api-design.md §2 (medications / supplements /
medication_schedules / medication_logs):
  - ``medications`` / ``supplements`` share an identical shape, so their
    validation lives in the ``MedicationLikeSerializer`` mixin.
  - ``frequency == "specific-days"`` requires a non-empty ``days_of_week``.
  - ``frequency == "every-n-days"`` requires ``interval_days`` (2-90).
  - ``times`` must be non-empty unless ``frequency == "as-needed"``.
  - ``medication_schedules`` / ``medication_logs`` reference a medication
    *or* supplement via ``(medication_id, source_type)``; ownership is
    checked against whichever table ``source_type`` points at.
  - ``medication_logs.quantity`` defaults to the source medication/
    supplement's ``dose`` when omitted on create.
"""

import re

from django.utils import timezone
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import Medication, MedicationLog, MedicationSchedule, Supplement

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

_MEDICATION_LIKE_FIELDS = [
    "id",
    "created_at",
    "updated_at",
    "version",
    "deleted",
    "name",
    "dose",
    "unit",
    "frequency",
    "days_of_week",
    "interval_days",
    "times",
    "start_date",
    "end_date",
    "with_food",
    "remaining_qty",
    "refill_reminder",
    "active",
    "notes",
]


def _resolve_source_model(source_type):
    return {"medication": Medication, "supplement": Supplement}.get(source_type)


class MedicationLikeSerializer(BaseModelSerializer):
    """Shared validation for ``medications`` / ``supplements``."""

    class Meta(BaseModelSerializer.Meta):
        fields = _MEDICATION_LIKE_FIELDS

    def validate_days_of_week(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("days_of_week 須為陣列。")
        if any(not isinstance(d, int) or not (0 <= d <= 6) for d in value):
            raise serializers.ValidationError("days_of_week 元素須為 0-6 之整數。")
        return value

    def validate_times(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("times 須為陣列。")
        if any(not isinstance(t, str) or not _HHMM_RE.match(t) for t in value):
            raise serializers.ValidationError("times 元素須為 HH:mm 格式字串。")
        return value

    def validate_refill_reminder(self, value):
        if not value:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("refill_reminder 須為物件。")
        if "enabled" not in value or not isinstance(value["enabled"], bool):
            raise serializers.ValidationError("refill_reminder.enabled 為必填布林值。")
        threshold = value.get("thresholdQty")
        if threshold is not None and not isinstance(threshold, (int, float)):
            raise serializers.ValidationError("refill_reminder.thresholdQty 須為數字。")
        return value

    def validate(self, attrs):
        frequency = attrs.get("frequency", getattr(self.instance, "frequency", None))
        days_of_week = attrs.get("days_of_week", getattr(self.instance, "days_of_week", None))
        interval_days = attrs.get("interval_days", getattr(self.instance, "interval_days", None))
        times = attrs.get("times", getattr(self.instance, "times", None))
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))

        errors = {}
        if frequency == "specific-days" and not days_of_week:
            errors["days_of_week"] = ["specific-days 頻率須提供 days_of_week。"]
        if frequency == "every-n-days" and interval_days is None:
            errors["interval_days"] = ["every-n-days 頻率須提供 interval_days（2-90）。"]
        if frequency != "as-needed" and not times:
            errors["times"] = ["非 as-needed 頻率須至少提供一個提醒時間。"]
        if start_date and end_date and end_date < start_date:
            errors["end_date"] = ["end_date 須晚於或等於 start_date。"]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class MedicationSerializer(MedicationLikeSerializer):
    class Meta(MedicationLikeSerializer.Meta):
        model = Medication


class SupplementSerializer(MedicationLikeSerializer):
    class Meta(MedicationLikeSerializer.Meta):
        model = Supplement


class MedicationScheduleSerializer(BaseModelSerializer):
    medication_id = serializers.UUIDField()

    class Meta(BaseModelSerializer.Meta):
        model = MedicationSchedule
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "medication_id",
            "source_type",
            "time_of_day",
            "label",
            "active",
        ]

    def validate_time_of_day(self, value):
        if not _HHMM_RE.match(value):
            raise serializers.ValidationError("time_of_day 格式須為 HH:mm。")
        return value

    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        medication_id = attrs.get("medication_id", getattr(self.instance, "medication_id", None))
        request = self.context.get("request")

        model = _resolve_source_model(source_type)
        if model is None:
            raise serializers.ValidationError(
                {"source_type": ["source_type 須為 medication 或 supplement。"]}
            )
        if medication_id is not None and request is not None:
            exists = model.all_objects.filter(id=medication_id, user=request.user).exists()
            if not exists:
                raise serializers.ValidationError({"medication_id": ["找不到指定的藥物/保健品。"]})
        return attrs


class MedicationLogSerializer(BaseModelSerializer):
    medication_id = serializers.UUIDField()
    schedule_id = serializers.PrimaryKeyRelatedField(
        source="schedule",
        queryset=MedicationSchedule.all_objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta(BaseModelSerializer.Meta):
        model = MedicationLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "medication_id",
            "source_type",
            "schedule_id",
            "scheduled_for",
            "status",
            "taken_at",
            "quantity",
            "note",
        ]

    def validate_schedule_id(self, schedule):
        if schedule is None:
            return schedule
        request = self.context.get("request")
        if request is not None and schedule.user_id != request.user.id:
            raise serializers.ValidationError("找不到指定的排程。")
        return schedule

    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        medication_id = attrs.get("medication_id", getattr(self.instance, "medication_id", None))
        request = self.context.get("request")

        model = _resolve_source_model(source_type)
        if model is None:
            raise serializers.ValidationError(
                {"source_type": ["source_type 須為 medication 或 supplement。"]}
            )

        source_obj = None
        if medication_id is not None and request is not None:
            source_obj = model.all_objects.filter(id=medication_id, user=request.user).first()
            if source_obj is None:
                raise serializers.ValidationError({"medication_id": ["找不到指定的藥物/保健品。"]})

        status_value = attrs.get("status", getattr(self.instance, "status", None))
        if status_value == "taken" and not attrs.get(
            "taken_at", getattr(self.instance, "taken_at", None)
        ):
            attrs["taken_at"] = (
                attrs.get("scheduled_for", getattr(self.instance, "scheduled_for", None))
                or timezone.now()
            )

        if self.instance is None and attrs.get("quantity") is None and source_obj is not None:
            attrs["quantity"] = source_obj.dose

        return attrs
