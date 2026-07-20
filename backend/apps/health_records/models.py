"""
health_records domain models.

Owned resources (contract/api-design.md §2.4, Appendix C -- module
`timeline`): health_documents, appointments, activities.

Field names mirror the contract's camelCase field table 1:1 after
snake_case conversion, e.g. `fileSizeKb` -> `file_size_kb`,
`appointmentId` -> `appointment` (FK, exposed as `appointment_id` in the
API via the serializer).
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel


class Appointment(OwnedModel):
    """回診／看診 -- contract/api-design.md §2.4 `appointments`."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "scheduled"
        COMPLETED = "completed", "completed"
        CANCELLED = "cancelled", "cancelled"
        NO_SHOW = "no_show", "no_show"

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    doctor = models.CharField(max_length=40, null=True, blank=True)
    department = models.CharField(max_length=40, null=True, blank=True)
    location = models.CharField(max_length=80)
    reason = models.CharField(max_length=200, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, db_index=True)
    reminder_minutes_before = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10080)],
    )
    follow_up_needed = models.BooleanField()
    notes = models.CharField(max_length=500, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "start_at"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):  # pragma: no cover
        return f"{self.location} @ {self.start_at}"


class HealthDocument(OwnedModel):
    """健康文件／附件 -- contract/api-design.md §2.4 `health_documents`."""

    class Category(models.TextChoices):
        LAB_REPORT = "檢驗報告", "檢驗報告"
        IMAGING_REPORT = "影像報告", "影像報告"
        DIAGNOSIS_CERTIFICATE = "診斷證明", "診斷證明"
        RECEIPT = "收據/費用", "收據/費用"
        REFERRAL = "轉診單", "轉診單"
        MEDICAL_SUMMARY = "病歷摘要", "病歷摘要"
        OTHER = "其他", "其他"

    date = models.DateField()
    category = models.CharField(max_length=20, choices=Category.choices, db_index=True)
    title = models.CharField(max_length=80)
    provider = models.CharField(max_length=60, null=True, blank=True)
    file_name = models.CharField(max_length=120, null=True, blank=True)
    mime_type = models.CharField(max_length=60, null=True, blank=True)
    # 附件內容 data URL；登入模式由後端決定實際儲存策略（建議改為物件儲存 URL），
    # 目前先接受任意長度文字內容，維持與前端本機模式相同的資料形狀。
    file_data_url = models.TextField(null=True, blank=True)
    file_size_kb = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="health_documents",
    )
    notes = models.CharField(max_length=500, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category"]),
            models.Index(fields=["user", "appointment"]),
        ]

    def __str__(self):  # pragma: no cover
        return self.title


class Activity(OwnedModel):
    """日活動量彙總 -- contract/api-design.md §2.4 `activities`."""

    class ActivityType(models.TextChoices):
        DAILY_SUMMARY = "daily_summary", "daily_summary"

    class Source(models.TextChoices):
        MANUAL = "manual", "manual"
        APPLE_HEALTH = "apple_health", "apple_health"
        WEARABLE = "wearable", "wearable"
        IMPORT = "import", "import"

    type = models.CharField(
        max_length=20, choices=ActivityType.choices, default=ActivityType.DAILY_SUMMARY
    )
    occurred_at = models.DateTimeField()
    date = models.DateField()
    steps = models.DecimalField(
        max_digits=8,
        decimal_places=0,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(200000)],
    )
    walk_time_min = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1440)],
    )
    stand_time_min = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1440)],
    )
    active_min = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1440)],
    )
    sedentary_min = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1440)],
    )
    distance_km = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    source = models.CharField(max_length=20, choices=Source.choices, db_index=True)
    is_primary = models.BooleanField()
    notes = models.CharField(max_length=300, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "source"]),
        ]

    def __str__(self):  # pragma: no cover
        return f"{self.date} ({self.source})"
