"""
calendar domain models.

Owned resources (contract/api-design.md §2, Appendix C): calendar_events

Field contract: contract/api-design.md ("calendar_events（日曆事件）"), snake_case
wire format per §0.2. `task_id` is a *soft* relation (contract §2 legend:
"前端未強制外鍵完整性，屬軟關聯") -- stored as a plain UUID, not a DB-level
ForeignKey, since the frontend never guarantees the referenced task exists.
"""

from django.db import models

from apps.core.models import OwnedModel

EVENT_TYPE_CHOICES = [
    ("meeting", "meeting"),
    ("task", "task"),
    ("personal", "personal"),
    ("health", "health"),
    ("reminder", "reminder"),
    ("other", "other"),
]


class CalendarEvent(OwnedModel):
    title = models.CharField(max_length=200)
    description = models.TextField(max_length=2000, blank=True, default="")
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    all_day = models.BooleanField()
    tz = models.CharField(max_length=64)
    type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    recurrence_rule = models.CharField(max_length=500, null=True, blank=True, default=None)
    task_id = models.UUIDField(null=True, blank=True, default=None)
    location = models.CharField(max_length=200, null=True, blank=True, default=None)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "start_at"]),
            models.Index(fields=["user", "end_at"]),
            models.Index(fields=["user", "task_id"]),
        ]

    def __str__(self):
        return self.title
