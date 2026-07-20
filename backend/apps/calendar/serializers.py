"""
calendar domain serializers.

Field contract: contract/api-design.md ("calendar_events（日曆事件）").
"""

import re
from zoneinfo import ZoneInfoNotFoundError, available_timezones

from django.utils.dateparse import parse_datetime
from rest_framework import serializers

from apps.calendar.models import CalendarEvent
from apps.core.serializers import BaseModelSerializer

_VALID_TIMEZONES = available_timezones()

# RRULE subset per contract: FREQ + INTERVAL + COUNT/UNTIL + BYDAY.
_RRULE_ALLOWED_KEYS = {"FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY"}
_RRULE_FREQ_VALUES = {"DAILY", "WEEKLY", "MONTHLY", "YEARLY"}
_RRULE_BYDAY_VALUES = {"MO", "TU", "WE", "TH", "FR", "SA", "SU"}


def _validate_rrule(value):
    parts = [p for p in value.split(";") if p]
    if not parts:
        raise serializers.ValidationError("recurrence_rule 格式不正確。")

    seen_keys = set()
    for part in parts:
        if "=" not in part:
            raise serializers.ValidationError(f"recurrence_rule 片段格式不正確：{part}")
        key, _, raw_value = part.partition("=")
        key = key.strip().upper()
        raw_value = raw_value.strip()
        if key not in _RRULE_ALLOWED_KEYS:
            raise serializers.ValidationError(f"recurrence_rule 不支援的欄位：{key}")
        if key in seen_keys:
            raise serializers.ValidationError(f"recurrence_rule 欄位重複：{key}")
        seen_keys.add(key)

        if key == "FREQ" and raw_value not in _RRULE_FREQ_VALUES:
            raise serializers.ValidationError(f"recurrence_rule FREQ 值不正確：{raw_value}")
        elif key == "INTERVAL":
            if not raw_value.isdigit() or int(raw_value) <= 0:
                raise serializers.ValidationError("recurrence_rule INTERVAL 必須為正整數。")
        elif key == "COUNT":
            if not raw_value.isdigit() or int(raw_value) <= 0:
                raise serializers.ValidationError("recurrence_rule COUNT 必須為正整數。")
        elif key == "UNTIL":
            if parse_datetime(raw_value) is None and not re.fullmatch(
                r"\d{8}(T\d{6}Z?)?", raw_value
            ):
                raise serializers.ValidationError(
                    "recurrence_rule UNTIL 必須為 ISO 8601 或 RRULE 日期格式。"
                )
        elif key == "BYDAY":
            days = raw_value.split(",")
            if not days or any(d not in _RRULE_BYDAY_VALUES for d in days):
                raise serializers.ValidationError("recurrence_rule BYDAY 值不正確。")

    if "FREQ" not in seen_keys:
        raise serializers.ValidationError("recurrence_rule 必須包含 FREQ。")
    if "COUNT" in seen_keys and "UNTIL" in seen_keys:
        raise serializers.ValidationError("recurrence_rule 不可同時指定 COUNT 與 UNTIL。")


class CalendarEventSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = CalendarEvent
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "title",
            "description",
            "start_at",
            "end_at",
            "all_day",
            "tz",
            "type",
            "recurrence_rule",
            "task_id",
            "location",
        ]

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("請輸入事件標題。")
        return value

    def validate_tz(self, value):
        try:
            if value not in _VALID_TIMEZONES:
                raise ZoneInfoNotFoundError
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError("tz 必須為有效的 IANA 時區名稱。") from exc
        return value

    def validate_recurrence_rule(self, value):
        if value in (None, ""):
            return value
        _validate_rrule(value)
        return value

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))
        if start_at is not None and end_at is not None and end_at < start_at:
            raise serializers.ValidationError({"end_at": ["end_at 不可早於 start_at。"]})
        return attrs
