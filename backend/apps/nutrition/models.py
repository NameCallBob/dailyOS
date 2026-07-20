"""
nutrition domain models.

Owned resources (contract/api-design.md §2, Appendix C): meal_logs
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel

MEAL_TYPE_CHOICES = [
    ("breakfast", "breakfast"),
    ("lunch", "lunch"),
    ("dinner", "dinner"),
    ("snack", "snack"),
    ("supplement", "supplement"),
]

NUTRIENT_VALIDATORS = [MinValueValidator(0), MaxValueValidator(100000)]


class MealLog(OwnedModel):
    """contract/api-design.md §2 -- `meal_logs`（飲食）"""

    date = models.DateField()
    logged_at = models.DateTimeField()
    type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES)
    photo = models.TextField(null=True, blank=True)
    text = models.TextField()
    food_tags = models.JSONField(default=list, blank=True)
    portion = models.CharField(max_length=200, null=True, blank=True)
    calories = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    protein = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    carb = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    fat = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    calcium = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    fiber = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    water = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, validators=NUTRIENT_VALIDATORS
    )
    custom_nutrients = models.JSONField(default=list, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-logged_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "type"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.date} {self.type} {self.text[:20]}"
