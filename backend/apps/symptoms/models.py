"""
symptoms domain models.

Owned resources (contract/api-design.md §2, Appendix C; openapi.yaml
`SymptomDefs` / `SymptomLogs` schemas): symptom_defs, symptom_logs

Field names mirror the contract's camelCase field table 1:1 after
snake_case conversion, e.g. `symptomDefId` -> `symptom_def` (FK, exposed
as `symptom_def_id` in the API via the serializer).
"""

from django.db import models

from apps.core.models import OwnedModel


class SymptomDef(OwnedModel):
    class Category(models.TextChoices):
        PAIN = "疼痛", "疼痛"
        SORE = "痠", "痠"
        NUMB = "麻", "麻"
        SWELLING = "腫脹", "腫脹"
        FATIGUE = "疲勞", "疲勞"
        HEADACHE = "頭痛", "頭痛"
        EMOTION = "情緒", "情緒"
        STRESS = "壓力", "壓力"
        CUSTOM = "自訂", "自訂"

    name = models.CharField(max_length=30)
    category = models.CharField(max_length=10, choices=Category.choices, db_index=True)
    note = models.CharField(max_length=200, null=True, blank=True)
    archived = models.BooleanField()

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "archived"])]

    def __str__(self):  # pragma: no cover
        return self.name


class SymptomLog(OwnedModel):
    symptom_def = models.ForeignKey(
        SymptomDef,
        on_delete=models.PROTECT,
        related_name="logs",
    )
    date = models.DateField(db_index=True)
    start_at = models.DateTimeField()
    intensity = models.DecimalField(max_digits=4, decimal_places=1)
    body_location = models.CharField(max_length=30, null=True, blank=True)
    duration_min = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True)
    # list[str], each item <=20 chars, max 10 items -- validated in serializer.
    triggers = models.JSONField(default=list, blank=True)
    relief = models.JSONField(default=list, blank=True)
    notes = models.CharField(max_length=500, null=True, blank=True)
    # dataURL string
    photo = models.TextField(null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "symptom_def"]),
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self):  # pragma: no cover
        return f"{self.symptom_def_id} @ {self.date}"
