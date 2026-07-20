"""
symptoms domain serializers.

Field-level validation mirrors contract/api-design.md §"symptom_defs" /
§"symptom_logs" (openapi.yaml `SymptomDefsInput` / `SymptomLogsInput`):

  - symptom_defs.name <=30, note <=200
  - symptom_logs.intensity 0-10, body_location <=30, duration_min 0-10080,
    triggers/relief: string[] (each item <=20 chars, max 10 items),
    notes <=500
  - symptom_logs.symptom_def_id must reference a SymptomDef owned by the
    requesting user (IDOR guard on the FK reference itself).
"""

from decimal import Decimal

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import SymptomDef, SymptomLog


class SymptomDefSerializer(BaseModelSerializer):
    name = serializers.CharField(max_length=30)
    note = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    archived = serializers.BooleanField()

    class Meta(BaseModelSerializer.Meta):
        model = SymptomDef
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "name",
            "category",
            "note",
            "archived",
        ]


def _validate_string_list(value, *, item_max_length, max_items, field_name):
    if not isinstance(value, list):
        raise serializers.ValidationError(f"{field_name} 必須是字串陣列。")
    if len(value) > max_items:
        raise serializers.ValidationError(f"{field_name} 最多 {max_items} 項。")
    for item in value:
        if not isinstance(item, str):
            raise serializers.ValidationError(f"{field_name} 的每一項都必須是字串。")
        if len(item) > item_max_length:
            raise serializers.ValidationError(f"{field_name} 的每一項最長 {item_max_length} 字元。")
    return value


class SymptomLogSerializer(BaseModelSerializer):
    symptom_def_id = serializers.PrimaryKeyRelatedField(
        source="symptom_def", queryset=SymptomDef.objects.all()
    )
    intensity = serializers.DecimalField(
        max_digits=4, decimal_places=1, min_value=Decimal("0"), max_value=Decimal("10")
    )
    body_location = serializers.CharField(
        max_length=30, required=False, allow_null=True, allow_blank=True
    )
    duration_min = serializers.DecimalField(
        max_digits=7,
        decimal_places=1,
        min_value=Decimal("0"),
        max_value=Decimal("10080"),
        required=False,
        allow_null=True,
    )
    triggers = serializers.ListField(child=serializers.CharField(), required=False)
    relief = serializers.ListField(child=serializers.CharField(), required=False)
    notes = serializers.CharField(max_length=500, required=False, allow_null=True, allow_blank=True)
    photo = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta(BaseModelSerializer.Meta):
        model = SymptomLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "symptom_def_id",
            "date",
            "start_at",
            "intensity",
            "body_location",
            "duration_min",
            "triggers",
            "relief",
            "notes",
            "photo",
        ]

    def validate_symptom_def_id(self, symptom_def):
        request = self.context.get("request")
        if request is not None and symptom_def.user_id != request.user.id:
            raise serializers.ValidationError("找不到指定的症狀定義。")
        return symptom_def

    def validate_triggers(self, value):
        return _validate_string_list(value, item_max_length=20, max_items=10, field_name="triggers")

    def validate_relief(self, value):
        return _validate_string_list(value, item_max_length=20, max_items=10, field_name="relief")
