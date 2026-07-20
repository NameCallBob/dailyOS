"""
focus domain models.

Owned resources (contract/api-design.md §2.1): timer_sessions, time_entries

``task_id`` / ``project_id`` reference resources owned by the ``tasks`` app
(``tasks``/``projects``). Since apps build out in parallel and this app must
not depend on another app's models/migrations, those references are kept as
loose UUID fields (not a Django ``ForeignKey``) rather than cross-app FKs.
``time_entries.timer_session_id`` references ``timer_sessions`` within this
same app, so it is a real FK.
"""

from django.core.validators import MinValueValidator
from django.db import models

from apps.core.models import OwnedModel

CATEGORY_CHOICES = [
    ("pomodoro", "pomodoro"),
    ("deep_work", "deep_work"),
    ("meeting", "meeting"),
    ("study", "study"),
    ("admin", "admin"),
    ("exercise", "exercise"),
    ("break", "break"),
    ("other", "other"),
]

STATUS_CHOICES = [
    ("running", "running"),
    ("paused", "paused"),
    ("completed", "completed"),
    ("cancelled", "cancelled"),
]

MODE_CHOICES = [
    ("stopwatch", "stopwatch"),
    ("pomodoro", "pomodoro"),
]

POMODORO_PHASE_CHOICES = [
    ("focus", "focus"),
    ("short_break", "short_break"),
    ("long_break", "long_break"),
]

SOURCE_CHOICES = [
    ("timer", "timer"),
    ("manual", "manual"),
]


class TimerSession(OwnedModel):
    label = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="deep_work")
    task_id = models.UUIDField(null=True, blank=True)
    project_id = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="stopwatch")
    target_seconds = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1)]
    )
    session_start_at = models.DateTimeField()
    accumulated_seconds = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    pomodoro_phase = models.CharField(
        max_length=20, choices=POMODORO_PHASE_CHOICES, null=True, blank=True
    )
    pomodoro_count = models.PositiveIntegerField(default=0)
    note = models.CharField(max_length=500, blank=True, default="")

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "deleted"]),
        ]

    def __str__(self):
        return f"{self.label} ({self.status})"


class TimeEntry(OwnedModel):
    label = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="deep_work")
    task_id = models.UUIDField(null=True, blank=True)
    project_id = models.UUIDField(null=True, blank=True)
    timer_session = models.ForeignKey(
        TimerSession,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="time_entries",
    )
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    duration_seconds = models.PositiveIntegerField()
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)
    note = models.CharField(max_length=500, blank=True, default="")

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "start_at"]),
            models.Index(fields=["user", "deleted"]),
        ]

    def __str__(self):
        return f"{self.label} ({self.duration_seconds}s)"
