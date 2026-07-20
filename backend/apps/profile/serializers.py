"""
profile domain serializers.

Field validation notes (contract/api-design.md §2.4):
  - `user_profile.birth_year`: model-level `MinValueValidator(1900)` plus a
    dynamic upper bound (current year) checked in `UserProfileSerializer.
    validate()` since it can't be expressed as a static model validator.
  - `notification_prefs.channels` / `dashboard_layout.widgets`: stored as
    JSONField but shaped/validated through a nested `Serializer` (same
    pattern as `apps.tasks.serializers.MilestoneSerializer`), so malformed
    payloads surface as normal `field_errors` instead of silently storing
    garbage JSON.
  - `dashboard_layout.widgets[].key`: constrained to `DashboardLayout.
    WIDGET_KEYS` (contract's `WIDGET_KEYS` enum -- values are the
    front-end's camelCase widget identifiers, not snake_case field names,
    so they are intentionally left unconverted).
"""

from django.utils import timezone
from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.profile.models import (
    DashboardLayout,
    NotificationPrefs,
    UserPreferences,
    UserProfile,
)


class UserProfileSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = UserProfile
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "display_name",
            "height_cm",
            "weight_kg",
            "birth_year",
            "sex",
            "activity_level",
            "fitness_goal",
            "water_goal_ml",
            "sleep_goal_hours",
            "step_goal_steps",
            "health_data_visibility",
        ]

    def validate_birth_year(self, value):
        current_year = timezone.now().year
        if value is not None and value > current_year:
            raise serializers.ValidationError(f"出生年份不可晚於 {current_year}。")
        return value


class UserPreferencesSerializer(BaseModelSerializer):
    purposes = serializers.ListField(
        child=serializers.ChoiceField(choices=UserPreferences.Purpose.choices), required=True
    )
    enabled_modules = serializers.ListField(child=serializers.CharField(), required=True)

    class Meta(BaseModelSerializer.Meta):
        model = UserPreferences
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "purposes",
            "enabled_modules",
            "onboarding_completed",
            "onboarding_step",
            "onboarding_skipped",
        ]


class ChannelsSerializer(serializers.Serializer):
    task_reminders = serializers.BooleanField()
    habit_reminders = serializers.BooleanField()
    medication_reminders = serializers.BooleanField()
    water_reminders = serializers.BooleanField()
    workout_reminders = serializers.BooleanField()
    appointment_reminders = serializers.BooleanField()
    weekly_summary = serializers.BooleanField()


QUIET_HOURS_TIME_REGEX = r"^([01]\d|2[0-3]):[0-5]\d$"


class NotificationPrefsSerializer(BaseModelSerializer):
    channels = ChannelsSerializer(required=True)
    quiet_hours_start = serializers.RegexField(
        QUIET_HOURS_TIME_REGEX, error_messages={"invalid": "時間格式須為 HH:mm。"}
    )
    quiet_hours_end = serializers.RegexField(
        QUIET_HOURS_TIME_REGEX, error_messages={"invalid": "時間格式須為 HH:mm。"}
    )

    class Meta(BaseModelSerializer.Meta):
        model = NotificationPrefs
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "channels",
            "quiet_hours_enabled",
            "quiet_hours_start",
            "quiet_hours_end",
            "timezone",
        ]


class WidgetSerializer(serializers.Serializer):
    key = serializers.ChoiceField(choices=list(DashboardLayout.WIDGET_KEYS))
    visible = serializers.BooleanField()
    order = serializers.IntegerField()


class DashboardLayoutSerializer(BaseModelSerializer):
    widgets = WidgetSerializer(many=True, required=True)

    class Meta(BaseModelSerializer.Meta):
        model = DashboardLayout
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "widgets",
        ]
