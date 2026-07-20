"""
sleep domain models.

Owned resources (contract/api-design.md §2, Appendix C): sleep_logs

Field contract (contract/api-design.md "sleep_logs"):
    date               date, required (the day of waking up)
    bedtime            ISO datetime, required
    sleep_at           ISO datetime, required (>= bedtime)
    wake_at            ISO datetime, required (> sleep_at)
    hours              number 0-24, required (client-computed, server re-validates)
    awakenings         int 0-20, default 0
    quality            int 1-5, required
    morning_energy     int 1-5, required
    pre_sleep_activity enum, default "none"
    notes              string <= 500
"""

from django.db import models

from apps.core.models import OwnedModel


class SleepLog(OwnedModel):
    class PreSleepActivity(models.TextChoices):
        SCREEN = "screen", "screen"
        READING = "reading", "reading"
        EXERCISE = "exercise", "exercise"
        MEAL = "meal", "meal"
        CAFFEINE = "caffeine", "caffeine"
        ALCOHOL = "alcohol", "alcohol"
        MEDITATION = "meditation", "meditation"
        WORK = "work", "work"
        NONE = "none", "none"
        OTHER = "other", "other"

    date = models.DateField()
    bedtime = models.DateTimeField()
    sleep_at = models.DateTimeField()
    wake_at = models.DateTimeField()
    hours = models.DecimalField(max_digits=4, decimal_places=2)
    awakenings = models.PositiveSmallIntegerField(default=0)
    quality = models.PositiveSmallIntegerField()
    morning_energy = models.PositiveSmallIntegerField()
    pre_sleep_activity = models.CharField(
        max_length=20,
        choices=PreSleepActivity.choices,
        default=PreSleepActivity.NONE,
    )
    notes = models.CharField(max_length=500, blank=True, default="")

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"SleepLog({self.user_id}, {self.date})"
