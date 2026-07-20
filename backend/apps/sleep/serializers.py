"""
sleep domain serializers.
"""

from decimal import Decimal

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.sleep.models import SleepLog

# Tolerance (in hours) allowed between the client-supplied `hours` value and
# the duration implied by `wake_at - sleep_at`, to absorb rounding.
_HOURS_TOLERANCE = Decimal("0.05")


class SleepLogSerializer(BaseModelSerializer):
    awakenings = serializers.IntegerField(min_value=0, max_value=20, required=False, default=0)
    quality = serializers.IntegerField(min_value=1, max_value=5)
    morning_energy = serializers.IntegerField(min_value=1, max_value=5)
    hours = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=0, max_value=24)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")

    class Meta(BaseModelSerializer.Meta):
        model = SleepLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "bedtime",
            "sleep_at",
            "wake_at",
            "hours",
            "awakenings",
            "quality",
            "morning_energy",
            "pre_sleep_activity",
            "notes",
        ]

    def validate(self, attrs):
        sleep_at = attrs.get("sleep_at", getattr(self.instance, "sleep_at", None))
        wake_at = attrs.get("wake_at", getattr(self.instance, "wake_at", None))
        bedtime = attrs.get("bedtime", getattr(self.instance, "bedtime", None))
        hours = attrs.get("hours", getattr(self.instance, "hours", None))

        if sleep_at is not None and bedtime is not None and sleep_at < bedtime:
            raise serializers.ValidationError({"sleep_at": "sleepAt 須大於等於 bedtime。"})

        if sleep_at is not None and wake_at is not None and wake_at <= sleep_at:
            raise serializers.ValidationError({"wake_at": "wakeAt 須大於 sleepAt。"})

        if sleep_at is not None and wake_at is not None and hours is not None:
            duration_hours = Decimal((wake_at - sleep_at).total_seconds()) / Decimal(3600)
            if abs(duration_hours - Decimal(hours)) > _HOURS_TOLERANCE:
                raise serializers.ValidationError(
                    {"hours": "hours 與 sleepAt/wakeAt 計算出的時數不一致。"}
                )

        return attrs
