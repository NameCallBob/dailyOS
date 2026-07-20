"""
tasks domain models.

Owned resources (contract/api-design.md §2.1): tasks, projects, tags

Field names mirror the contract's camelCase field table 1:1 after
snake_case conversion, e.g. `dueDate` -> `due_date`, `projectId` -> `project`
(FK, exposed as `project_id` in the API via the serializer).
"""

from django.db import models

from apps.core.models import OwnedModel


class Project(OwnedModel):
    class Status(models.TextChoices):
        PLANNING = "planning", "planning"
        ACTIVE = "active", "active"
        ON_HOLD = "on_hold", "on_hold"
        COMPLETED = "completed", "completed"
        ARCHIVED = "archived", "archived"

    name = models.CharField(max_length=120)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNING, db_index=True
    )
    color = models.CharField(max_length=20, default="#8a6a52")
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True)
    # `milestones`: list[{id, title, due_date, done}], validated at the
    # serializer layer (see MilestoneSerializer in serializers.py).
    milestones = models.JSONField(default=list, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self):  # pragma: no cover
        return self.name

    def compute_progress(self):
        """`progress` (0-100) is derived from owned tasks, per the
        integration brief: "Project progress 由任務推導" -- it is never
        stored/settable directly, only computed on read."""
        tasks = self.tasks.filter(deleted=False)
        total = tasks.count()
        if total == 0:
            return 0
        completed = tasks.filter(status=Task.Status.COMPLETED).count()
        return round(completed / total * 100)


class Tag(OwnedModel):
    name = models.CharField(max_length=40)
    color = models.CharField(max_length=20, default="#6b6b6b")

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "name"])]

    def __str__(self):  # pragma: no cover
        return self.name


class Task(OwnedModel):
    class Status(models.TextChoices):
        INBOX = "inbox", "inbox"
        PLANNED = "planned", "planned"
        IN_PROGRESS = "in_progress", "in_progress"
        COMPLETED = "completed", "completed"
        CANCELLED = "cancelled", "cancelled"

    class Priority(models.TextChoices):
        LOW = "low", "low"
        MED = "med", "med"
        HIGH = "high", "high"
        URGENT = "urgent", "urgent"

    class Energy(models.TextChoices):
        LOW = "low", "low"
        MED = "med", "med"
        HIGH = "high", "high"

    title = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.INBOX, db_index=True
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MED, db_index=True
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )
    # Free-form label strings (not a FK relation) per contract §2.1.
    tags = models.JSONField(default=list, blank=True)
    due_date = models.DateField(null=True, blank=True, db_index=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    estimate_min = models.PositiveIntegerField(null=True, blank=True)
    actual_min = models.PositiveIntegerField(null=True, blank=True)
    energy = models.CharField(max_length=10, choices=Energy.choices, null=True, blank=True)
    context = models.CharField(max_length=200, null=True, blank=True)
    recurrence_rule = models.CharField(max_length=200, null=True, blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )
    # List of other task ids this task depends on. Soft relation (no FK
    # integrity enforced) per the contract's FK legend; cycle-checked in
    # the serializer instead.
    depends_on = models.JSONField(default=list, blank=True)
    remind_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    archived = models.BooleanField(default=False)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "project"]),
            models.Index(fields=["user", "parent"]),
        ]

    def __str__(self):  # pragma: no cover
        return self.title
