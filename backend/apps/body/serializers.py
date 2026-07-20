"""
body domain serializers.

Field contract: contract/api-design.md §2.3 `body_metrics` / `water_logs`.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import BodyMetrics, WaterLog


def _validate_custom_metrics(value):
    """`{ id, label(<=20), value, unit(<=10) }[]` per contract §2.3."""
    if value in (None, ""):
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError("custom_metrics 必須是陣列。")
    for item in value:
        if not isinstance(item, dict):
            raise serializers.ValidationError("custom_metrics 的每個項目必須是物件。")
        for key in ("id", "label", "value", "unit"):
            if key not in item:
                raise serializers.ValidationError(f"custom_metrics 項目缺少欄位：{key}。")
        if not isinstance(item["label"], str) or len(item["label"]) > 20:
            raise serializers.ValidationError("custom_metrics.label 必須是字串且長度 <= 20。")
        if not isinstance(item["unit"], str) or len(item["unit"]) > 10:
            raise serializers.ValidationError("custom_metrics.unit 必須是字串且長度 <= 10。")
        if not isinstance(item["value"], (int, float)):
            raise serializers.ValidationError("custom_metrics.value 必須是數字。")
    return value


class BodyMetricsSerializer(BaseModelSerializer):
    custom_metrics = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )

    class Meta(BaseModelSerializer.Meta):
        model = BodyMetrics
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "logged_at",
            "weight_kg",
            "body_fat_percent",
            "muscle_mass_kg",
            "skeletal_muscle_kg",
            "visceral_fat_level",
            "waist_cm",
            "chest_cm",
            "hip_cm",
            "arm_cm",
            "thigh_cm",
            "calf_cm",
            "resting_heart_rate",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "spo2_percent",
            "body_temp_celsius",
            "custom_metrics",
            "note",
            "source",
        ]

    def validate_weight_kg(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("weight_kg 必須大於 0。")
        return value

    def validate_custom_metrics(self, value):
        return _validate_custom_metrics(value)


class WaterLogSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = WaterLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "logged_at",
            "amount_ml",
            "container_label",
            "note",
            "source",
        ]

    def validate_amount_ml(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("amount_ml 必須大於 0。")
        return value
