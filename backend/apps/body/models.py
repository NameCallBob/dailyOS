"""
body domain models.

Owned resources (contract/api-design.md §2.3, §2.4): body_metrics, water_logs.
(user_profile belongs to apps.profile -- read-only reference for this
module, not defined here.)
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel

SOURCE_CHOICES = [
    ("manual", "manual"),
    ("device", "device"),
]


class BodyMetrics(OwnedModel):
    """身形量測 -- contract/api-design.md §2.3 `body_metrics`."""

    date = models.DateField()
    logged_at = models.DateTimeField()
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(400)],
    )
    body_fat_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(80)],
    )
    muscle_mass_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(200)],
    )
    skeletal_muscle_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(150)],
    )
    visceral_fat_level = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(60)],
    )
    waist_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    chest_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    hip_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    arm_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(120)],
    )
    thigh_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(150)],
    )
    calf_cm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(120)],
    )
    resting_heart_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    blood_pressure_systolic = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
    )
    blood_pressure_diastolic = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(200)],
    )
    spo2_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    body_temp_celsius = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(25), MaxValueValidator(45)],
    )
    custom_metrics = models.JSONField(default=list, blank=True)
    note = models.CharField(max_length=500, null=True, blank=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "logged_at"]),
        ]


class WaterLog(OwnedModel):
    """飲水 -- contract/api-design.md §2.3 `water_logs`."""

    date = models.DateField()
    logged_at = models.DateTimeField()
    amount_ml = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(5000)],
    )
    container_label = models.CharField(max_length=40, null=True, blank=True)
    note = models.CharField(max_length=300, null=True, blank=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "logged_at"]),
        ]
