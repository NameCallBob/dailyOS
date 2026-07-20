"""
rehab domain models.

Owned resources (contract/api-design.md §2.3): rehab_plans, rehab_exercises,
rehab_sessions.

Field names mirror the contract's camelCase field table 1:1 after
snake_case conversion, e.g. `rehabPlanId` -> `rehab_plan` (FK, exposed as
`rehab_plan_id` in the API via the serializer).

System-strength guardrail (contract §2.3, rehab_exercises):
"系統不得自行增加復健強度或建議加量" -- `sets`/`reps`/`duration_sec`/
`load_limit`/`angle`/`frequency` are only ever changed via a user-issued
PATCH; no auto-adjust endpoint/logic exists anywhere in this app.
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from apps.core.models import OwnedModel


class RehabPlan(OwnedModel):
    name = models.CharField(max_length=60)
    body_region = models.CharField(max_length=30, null=True, blank=True)
    diagnosis = models.CharField(max_length=120, null=True, blank=True)
    goal = models.CharField(max_length=200, null=True, blank=True)
    therapist_name = models.CharField(max_length=30, null=True, blank=True)
    clinic_name = models.CharField(max_length=40, null=True, blank=True)
    active = models.BooleanField()
    start_date = models.DateField()
    next_appointment_at = models.DateField(null=True, blank=True)
    general_cautions = models.CharField(max_length=300, null=True, blank=True)
    # list[{id, date, note, adjustment?: bool}], validated at the
    # serializer layer (see ReviewNoteSerializer in serializers.py).
    review_notes = models.JSONField(default=list, blank=True, encoder=DjangoJSONEncoder)
    note = models.CharField(max_length=500, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "active"])]

    def __str__(self):  # pragma: no cover
        return self.name


class RehabExercise(OwnedModel):
    rehab_plan = models.ForeignKey(RehabPlan, on_delete=models.CASCADE, related_name="exercises")
    name = models.CharField(max_length=60)
    instructions = models.CharField(max_length=600, null=True, blank=True)
    media = models.CharField(max_length=300, null=True, blank=True)
    sets = models.PositiveSmallIntegerField(null=True, blank=True)
    reps = models.PositiveSmallIntegerField(null=True, blank=True)
    duration_sec = models.PositiveIntegerField(null=True, blank=True)
    load_limit = models.CharField(max_length=40, null=True, blank=True)
    angle = models.CharField(max_length=40, null=True, blank=True)
    cautions = models.CharField(max_length=300, null=True, blank=True)
    frequency = models.CharField(max_length=60, null=True, blank=True)
    therapist_note = models.CharField(max_length=300, null=True, blank=True)
    effective_date = models.DateField()
    stop_date = models.DateField(null=True, blank=True)
    order = models.IntegerField(null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [models.Index(fields=["user", "rehab_plan"])]

    def __str__(self):  # pragma: no cover
        return self.name


class RehabSession(OwnedModel):
    rehab_plan = models.ForeignKey(RehabPlan, on_delete=models.CASCADE, related_name="sessions")
    rehab_exercise = models.ForeignKey(
        RehabExercise, on_delete=models.CASCADE, related_name="sessions"
    )
    date = models.DateField()
    done = models.BooleanField()
    actual_sets = models.PositiveSmallIntegerField(null=True, blank=True)
    actual_reps = models.PositiveSmallIntegerField(null=True, blank=True)
    actual_time = models.PositiveIntegerField(null=True, blank=True)
    discomfort_before = models.PositiveSmallIntegerField(null=True, blank=True)
    discomfort_after = models.PositiveSmallIntegerField(null=True, blank=True)
    load = models.CharField(max_length=40, null=True, blank=True)
    notes = models.CharField(max_length=300, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        indexes = [
            models.Index(fields=["user", "rehab_plan"]),
            models.Index(fields=["user", "rehab_exercise"]),
            models.Index(fields=["user", "date"]),
        ]

    def __str__(self):  # pragma: no cover
        return f"{self.rehab_exercise_id} @ {self.date}"
