"""
Abstract base models shared by every domain app.

See contract/api-design.md §0.7 (BaseRecord) for the field contract:
    id, created_at, updated_at, version, deleted

All resource records also carry those five fields verbatim (snake_case)
in API responses.
"""

import uuid

from django.conf import settings
from django.db import models


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted=False)

    def dead(self):
        return self.filter(deleted=True)


class SoftDeleteManager(models.Manager):
    """Default manager: excludes soft-deleted rows.

    Use ``Model.all_objects`` when soft-deleted rows must be visible
    (e.g. the ``?deleted=true`` list query param, or the trash/restore UI).
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted=False)


class BaseModel(models.Model):
    """Abstract base providing the BaseRecord contract fields.

    id       - UUID primary key. Clients may supply their own uuid on POST
               (upsert semantics per contract §0.7); accepted as-is.
    created_at / updated_at - server-assigned timestamps.
    version  - starts at 1, incremented by +1 on every successful write
               (see apps.core.viewsets.OwnedModelViewSet.perform_update).
    deleted  - soft-delete flag; DELETE sets this True instead of removing
               the row (tombstone kept for offline sync / undo).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.PositiveIntegerField(default=1)
    deleted = models.BooleanField(default=False)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class OwnedModel(BaseModel):
    """Abstract base for records that belong to a single user (IDOR guard).

    Every domain model should inherit from this (rather than BaseModel
    directly) unless it is explicitly a global/shared resource.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]
