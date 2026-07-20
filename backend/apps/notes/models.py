"""
notes domain models.

Owned resources (contract/api-design.md §2.2): notes, note_versions

Field tables and custom actions come straight from
contract/api-design.md "#### `notes`（筆記）" and
"#### `note_versions`（筆記版本快照）".
"""

from django.db import models

from apps.core.models import OwnedModel


class Note(OwnedModel):
    """A single markdown note (contract §2.2 `notes`)."""

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "folder"]),
            models.Index(fields=["user", "pinned"]),
            models.Index(fields=["user", "is_daily", "daily_date"]),
        ]

    title = models.CharField(max_length=200)
    content = models.TextField(max_length=200000, blank=True, default="")
    folder = models.CharField(max_length=200, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    pinned = models.BooleanField(default=False)
    is_daily = models.BooleanField(default=False)
    daily_date = models.DateField(null=True, blank=True)

    # Soft (non-FK) relations per contract: "軟關聯（不強制對應真實 project）".
    project_id = models.CharField(max_length=64, blank=True, default="")
    project_name = models.CharField(max_length=200, blank=True, default="")
    task_id = models.CharField(max_length=64, blank=True, default="")
    task_title = models.CharField(max_length=200, blank=True, default="")

    def __str__(self) -> str:  # pragma: no cover - debug helper
        return self.title


class NoteVersionReason(models.TextChoices):
    MANUAL_SAVE = "manual_save", "manual_save"
    AUTO_SNAPSHOT = "auto_snapshot", "auto_snapshot"
    RESTORE = "restore", "restore"
    CONFLICT_BRANCH = "conflict_branch", "conflict_branch"


class NoteVersion(OwnedModel):
    """Snapshot of a note at a point in time (contract §2.2 `note_versions`)."""

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "note"])]

    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    title = models.CharField(max_length=200, blank=True, default="")
    content = models.TextField(max_length=200000, blank=True, default="")
    folder = models.CharField(max_length=200, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    reason = models.CharField(
        max_length=20,
        choices=NoteVersionReason.choices,
        default=NoteVersionReason.MANUAL_SAVE,
    )
    note_version_at_snapshot = models.PositiveIntegerField()

    def __str__(self) -> str:  # pragma: no cover - debug helper
        return f"{self.note_id} @ v{self.note_version_at_snapshot}"
