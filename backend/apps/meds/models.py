"""
meds domain models.

Owned resources (contract/api-design.md §2, Appendix C):
``medications``, ``medication_schedules``, ``medication_logs``, ``supplements``.

``medications`` and ``supplements`` are field-for-field identical
("兩者欄位完全相同，分屬不同資料表") so they share the abstract
``MedicationLike`` base and live in two separate tables.

``medication_schedules`` / ``medication_logs`` reference either a
``Medication`` or a ``Supplement`` row via a plain UUID + ``source_type``
enum pair (a real FK can't target two different tables), resolved and
ownership-checked in the serializer layer.
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel

FREQUENCY_CHOICES = [
    ("daily", "daily"),
    ("specific-days", "specific-days"),
    ("every-n-days", "every-n-days"),
    ("as-needed", "as-needed"),
]

WITH_FOOD_CHOICES = [
    ("with_food", "with_food"),
    ("empty_stomach", "empty_stomach"),
    ("either", "either"),
]

SOURCE_TYPE_CHOICES = [
    ("medication", "medication"),
    ("supplement", "supplement"),
]

LOG_STATUS_CHOICES = [
    ("taken", "taken"),
    ("missed", "missed"),
    ("skipped", "skipped"),
]


class MedicationLike(OwnedModel):
    """Shared fields for ``medications`` / ``supplements`` (contract §2 "meds")."""

    name = models.CharField(max_length=80)
    dose = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=20)
    frequency = models.CharField(max_length=16, choices=FREQUENCY_CHOICES)
    # int[0-6][] -- days of week for "specific-days" frequency.
    days_of_week = models.JSONField(default=list, blank=True)
    interval_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(2), MaxValueValidator(90)],
    )
    # string[] of "HH:mm"; may be an empty list only for "as-needed".
    times = models.JSONField(default=list, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    with_food = models.CharField(max_length=16, choices=WITH_FOOD_CHOICES)
    remaining_qty = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    # {enabled: bool, thresholdQty: number}
    refill_reminder = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=True)
    notes = models.CharField(max_length=280, blank=True, null=True)

    class Meta(OwnedModel.Meta):
        abstract = True
        indexes = [
            models.Index(fields=["user", "active"]),
        ]

    def __str__(self) -> str:
        return self.name


class Medication(MedicationLike):
    """``medications`` resource."""


class Supplement(MedicationLike):
    """``supplements`` resource."""


class MedicationSchedule(OwnedModel):
    """A time-of-day slot for taking a medication or supplement."""

    medication_id = models.UUIDField()
    source_type = models.CharField(max_length=16, choices=SOURCE_TYPE_CHOICES)
    time_of_day = models.CharField(max_length=5)
    label = models.CharField(max_length=40, blank=True, null=True)
    active = models.BooleanField(default=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "medication_id", "source_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_type}:{self.medication_id} @ {self.time_of_day}"


class MedicationLog(OwnedModel):
    """A taken/missed/skipped record for a scheduled (or ad-hoc) dose."""

    medication_id = models.UUIDField()
    source_type = models.CharField(max_length=16, choices=SOURCE_TYPE_CHOICES)
    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="logs",
    )
    scheduled_for = models.DateTimeField()
    status = models.CharField(max_length=16, choices=LOG_STATUS_CHOICES)
    taken_at = models.DateTimeField(null=True, blank=True)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    note = models.CharField(max_length=200, blank=True, null=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "medication_id", "source_type"]),
            models.Index(fields=["user", "scheduled_for"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_type}:{self.medication_id} @ {self.scheduled_for} [{self.status}]"
