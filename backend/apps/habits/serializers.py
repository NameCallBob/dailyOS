"""
habits domain serializers.

Validation rules per contract/api-design.md §2.2 (habits / habit_logs):
  - ``icon`` is a 1-4 character emoji.
  - ``target_value`` is fixed at 1 for ``type == "boolean"``.
  - ``schedule`` shape depends on ``schedule.type``
    (weekly-days needs ``days``, monthly needs ``dayOfMonth``,
    every-n-days needs ``n`` in [2, 90]).
  - ``reminder_time`` is ``HH:mm``.
  - ``habit_logs`` allows at most one (non-deleted) log per
    (habit, date) pair -- "一天最多一筆彙總".
"""

import re

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import Habit, HabitLog

_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class HabitSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Habit
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "name",
            "icon",
            "type",
            "unit",
            "target_value",
            "increment",
            "schedule",
            "reminder_time",
            "archived",
            "notes",
            "sort_order",
        ]

    def validate_icon(self, value):
        if not (1 <= len(value) <= 4):
            raise serializers.ValidationError("icon 長度須為 1-4 字元。")
        return value

    def validate_reminder_time(self, value):
        if value in (None, ""):
            return value
        if not _HHMM_RE.match(value):
            raise serializers.ValidationError("reminder_time 格式須為 HH:mm。")
        return value

    def validate_schedule(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("schedule 須為物件。")
        schedule_type = value.get("type")
        if schedule_type not in {"daily", "weekly-days", "monthly", "every-n-days"}:
            raise serializers.ValidationError(
                "schedule.type 須為 daily/weekly-days/monthly/every-n-days 其中之一。"
            )
        if schedule_type == "weekly-days":
            days = value.get("days")
            if not isinstance(days, list) or not days:
                raise serializers.ValidationError("weekly-days 排程須提供 days 陣列。")
            if any(not isinstance(d, int) or not (0 <= d <= 6) for d in days):
                raise serializers.ValidationError("days 須為 0-6 之整數。")
        elif schedule_type == "monthly":
            day_of_month = value.get("dayOfMonth")
            if not isinstance(day_of_month, int) or not (1 <= day_of_month <= 31):
                raise serializers.ValidationError("monthly 排程須提供 1-31 之 dayOfMonth。")
        elif schedule_type == "every-n-days":
            n = value.get("n")
            if not isinstance(n, int) or not (2 <= n <= 90):
                raise serializers.ValidationError("every-n-days 排程須提供 2-90 之 n。")
        return value

    def validate(self, attrs):
        habit_type = attrs.get("type", getattr(self.instance, "type", None))
        target_value = attrs.get("target_value", getattr(self.instance, "target_value", None))
        if habit_type == "boolean" and target_value is not None and target_value != 1:
            raise serializers.ValidationError(
                {"target_value": ["boolean 類型的 target_value 須固定為 1。"]}
            )
        return attrs


class HabitLogSerializer(BaseModelSerializer):
    habit_id = serializers.PrimaryKeyRelatedField(source="habit", queryset=Habit.all_objects.all())

    class Meta(BaseModelSerializer.Meta):
        model = HabitLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "habit_id",
            "date",
            "value",
            "note",
            "logged_at",
        ]

    def validate_habit_id(self, habit):
        request = self.context.get("request")
        if request is not None and habit.user_id != request.user.id:
            raise serializers.ValidationError("找不到指定的 habit。")
        return habit

    def validate(self, attrs):
        habit = attrs.get("habit", getattr(self.instance, "habit", None))
        date = attrs.get("date", getattr(self.instance, "date", None))
        request = self.context.get("request")
        if habit is not None and date is not None and request is not None:
            existing = HabitLog.objects.filter(user=request.user, habit=habit, date=date).exclude(
                pk=getattr(self.instance, "pk", None)
            )
            if existing.exists():
                raise serializers.ValidationError({"date": ["該習慣於此日期已有打卡紀錄。"]})
        return attrs
