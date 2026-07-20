"""
habits domain models.

Owned resources (contract/api-design.md §2.2, openapi.yaml Habits /
HabitLogs schemas): ``habits``, ``habit_logs``.
"""

from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import OwnedModel

HABIT_TYPE_CHOICES = [
    ("boolean", "boolean"),
    ("count", "count"),
    ("numeric", "numeric"),
    ("duration", "duration"),
]

SCHEDULE_TYPE_CHOICES = [
    ("daily", "daily"),
    ("weekly-days", "weekly-days"),
    ("monthly", "monthly"),
    ("every-n-days", "every-n-days"),
]


class Habit(OwnedModel):
    """A habit definition (contract §2.2 ``habits``)."""

    name = models.CharField(max_length=60)
    icon = models.CharField(max_length=4)
    type = models.CharField(max_length=16, choices=HABIT_TYPE_CHOICES)
    unit = models.CharField(max_length=12, blank=True, null=True)
    target_value = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    increment = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    # {type, days?, dayOfMonth?, n?, anchorDate?} -- see contract §2.2.
    schedule = models.JSONField()
    reminder_time = models.CharField(max_length=5, blank=True, null=True)
    archived = models.BooleanField(default=False)
    notes = models.CharField(max_length=280, blank=True, null=True)
    sort_order = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "archived"]),
            models.Index(fields=["user", "sort_order"]),
        ]

    def __str__(self) -> str:
        return self.name


class HabitLog(OwnedModel):
    """A single day's check-in for a habit (contract §2.2 ``habit_logs``)."""

    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="logs")
    date = models.DateField()
    value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    note = models.CharField(max_length=200, blank=True, null=True)
    logged_at = models.DateTimeField()

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "habit", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.habit_id} @ {self.date}"
