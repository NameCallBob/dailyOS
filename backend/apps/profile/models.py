"""
profile domain models.

Owned resources (contract/api-design.md §2.4, Appendix C):
    user_profile, user_preferences, notification_prefs, dashboard_layout

All four are *singleton* resources -- "每位使用者僅一筆現行設定" (contract
§2.4 note under `user_profile`). Enforced here with a partial unique
constraint on `user` restricted to non-deleted rows (a soft-deleted row
must not block a fresh singleton being created for the same user), and at
the view layer `SingletonCreateMixin` (see views.py) returns the existing
record instead of erroring on a second `create()`.
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel


class UserProfile(OwnedModel):
    class Sex(models.TextChoices):
        FEMALE = "female", "female"
        MALE = "male", "male"
        OTHER = "other", "other"
        UNSPECIFIED = "unspecified", "unspecified"

    class ActivityLevel(models.TextChoices):
        SEDENTARY = "sedentary", "sedentary"
        LIGHT = "light", "light"
        MODERATE = "moderate", "moderate"
        ACTIVE = "active", "active"
        VERY_ACTIVE = "very_active", "very_active"

    class FitnessGoal(models.TextChoices):
        LOSE_WEIGHT = "lose_weight", "lose_weight"
        MAINTAIN = "maintain", "maintain"
        BUILD_MUSCLE = "build_muscle", "build_muscle"
        IMPROVE_ENDURANCE = "improve_endurance", "improve_endurance"
        GENERAL_HEALTH = "general_health", "general_health"

    class HealthDataVisibility(models.TextChoices):
        PRIVATE = "private", "private"
        SHARED = "shared", "shared"

    display_name = models.CharField(max_length=40, blank=True, default="")
    height_cm = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(50), MaxValueValidator(260)]
    )
    weight_kg = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(20), MaxValueValidator(400)]
    )
    birth_year = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1900)]
    )
    sex = models.CharField(max_length=20, choices=Sex.choices, null=True, blank=True)
    activity_level = models.CharField(
        max_length=20, choices=ActivityLevel.choices, null=True, blank=True
    )
    fitness_goal = models.CharField(
        max_length=30, choices=FitnessGoal.choices, null=True, blank=True
    )
    water_goal_ml = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(500), MaxValueValidator(8000)]
    )
    sleep_goal_hours = models.FloatField(
        null=True, blank=True, validators=[MinValueValidator(3), MaxValueValidator(14)]
    )
    step_goal_steps = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1000), MaxValueValidator(50000)]
    )
    health_data_visibility = models.CharField(
        max_length=10,
        choices=HealthDataVisibility.choices,
        default=HealthDataVisibility.PRIVATE,
    )

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(deleted=False),
                name="profile_unique_active_user_profile",
            )
        ]

    def __str__(self):  # pragma: no cover
        return self.display_name or str(self.user_id)


class UserPreferences(OwnedModel):
    class Purpose(models.TextChoices):
        WORK = "work", "work"
        HEALTH = "health", "health"
        HABIT = "habit", "habit"
        NOTES = "notes", "notes"

    # enum[] -- validated in serializer against Purpose.values.
    purposes = models.JSONField(default=list, blank=True)
    # string[] -- module keys, free-form (front-end owns the registry).
    enabled_modules = models.JSONField(default=list, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    onboarding_step = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(4)]
    )
    onboarding_skipped = models.BooleanField(default=False)

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(deleted=False),
                name="profile_unique_active_user_preferences",
            )
        ]

    def __str__(self):  # pragma: no cover
        return f"preferences({self.user_id})"


class NotificationPrefs(OwnedModel):
    CHANNEL_KEYS = (
        "task_reminders",
        "habit_reminders",
        "medication_reminders",
        "water_reminders",
        "workout_reminders",
        "appointment_reminders",
        "weekly_summary",
    )

    # `{ taskReminders, habitReminders, medicationReminders, waterReminders,
    #    workoutReminders, appointmentReminders, weeklySummary: boolean }`
    # (contract §2.4) -- stored snake_case, validated in serializer.
    channels = models.JSONField(default=dict, blank=True)
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.CharField(max_length=5, default="22:00")
    quiet_hours_end = models.CharField(max_length=5, default="07:00")
    timezone = models.CharField(max_length=64, default="UTC")

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(deleted=False),
                name="profile_unique_active_notification_prefs",
            )
        ]

    def __str__(self):  # pragma: no cover
        return f"notification_prefs({self.user_id})"


class DashboardLayout(OwnedModel):
    WIDGET_KEYS = (
        "greeting",
        "quickAdd",
        "topTasks",
        "todaySchedule",
        "overdueTasks",
        "activeTimer",
        "completionRate",
        "water",
        "activity",
        "healthStatus",
        "habits",
        "suggestions",
        "recentNotes",
    )

    # `{ key: string, visible: boolean, order: number }[]` (contract §2.4).
    widgets = models.JSONField(default=list, blank=True)

    class Meta(OwnedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(deleted=False),
                name="profile_unique_active_dashboard_layout",
            )
        ]

    def __str__(self):  # pragma: no cover
        return f"dashboard_layout({self.user_id})"
