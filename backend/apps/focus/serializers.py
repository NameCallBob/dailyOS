"""
focus domain serializers.

Contract rules enforced here (contract/api-design.md §2.1 timer_sessions):
  - a user may have at most one `running`/`paused` timer_session at a time.
  - `target_seconds` must be > 0 when provided (enforced via model validator
    + explicit serializer check for a clean field_errors message).
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import TimeEntry, TimerSession

ACTIVE_STATUSES = ("running", "paused")


class TimerSessionSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = TimerSession
        fields = [
            "id",
            "label",
            "category",
            "task_id",
            "project_id",
            "status",
            "mode",
            "target_seconds",
            "session_start_at",
            "accumulated_seconds",
            "started_at",
            "paused_at",
            "completed_at",
            "pomodoro_phase",
            "pomodoro_count",
            "note",
            "created_at",
            "updated_at",
            "version",
            "deleted",
        ]

    def validate_target_seconds(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("target_seconds 必須大於 0。")
        return value

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        if status in ACTIVE_STATUSES:
            request = self.context.get("request")
            user = getattr(request, "user", None)
            if user is not None:
                qs = TimerSession.all_objects.filter(
                    user=user, deleted=False, status__in=ACTIVE_STATUSES
                )
                if self.instance is not None:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError(
                        {
                            "status": [
                                "已有一個進行中或暫停中的計時器，"
                                "同一時間僅允許一個 running/paused session。"
                            ]
                        }
                    )
        return attrs


class TimeEntrySerializer(BaseModelSerializer):
    timer_session_id = serializers.PrimaryKeyRelatedField(
        source="timer_session",
        queryset=TimerSession.all_objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta(BaseModelSerializer.Meta):
        model = TimeEntry
        fields = [
            "id",
            "label",
            "category",
            "task_id",
            "project_id",
            "timer_session_id",
            "start_at",
            "end_at",
            "duration_seconds",
            "source",
            "note",
            "created_at",
            "updated_at",
            "version",
            "deleted",
        ]

    def validate(self, attrs):
        timer_session = attrs.get("timer_session")
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if timer_session is not None and user is not None and timer_session.user_id != user.id:
            raise serializers.ValidationError(
                {"timer_session_id": ["找不到指定的 timer_session。"]}
            )
        return attrs
