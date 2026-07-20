"""
workouts domain models.

Owned resources (contract/api-design.md §2, "workouts" 模組):
workouts, workout_exercises, workout_sets, exercise_defs.

Field names mirror the contract's camelCase field table 1:1 after
snake_case conversion, e.g. `startAt` -> `start_at`, `workoutId` -> `workout`
(FK, exposed as `workout_id` in the API via the serializer).
"""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import OwnedModel


class Workout(OwnedModel):
    """`workouts`（訓練紀錄）— contract §2 workouts."""

    class WorkoutType(models.TextChoices):
        STRENGTH = "重訓", "重訓"
        BODYWEIGHT = "徒手", "徒手"
        WALK = "步行", "步行"
        RUN = "跑步", "跑步"
        CYCLE = "單車", "單車"
        SWIM = "游泳", "游泳"
        YOGA = "瑜伽", "瑜伽"
        STRETCH = "伸展", "伸展"
        REHAB = "復健", "復健"
        CUSTOM = "自訂", "自訂"

    class Feeling(models.TextChoices):
        ENERGETIC = "energetic", "energetic"
        GOOD = "good", "good"
        NORMAL = "normal", "normal"
        TIRED = "tired", "tired"
        EXHAUSTED = "exhausted", "exhausted"

    date = models.DateField(db_index=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    type = models.CharField(max_length=10, choices=WorkoutType.choices, db_index=True)
    goal = models.CharField(max_length=200, null=True, blank=True)
    duration_min = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(1000)]
    )
    rpe = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    avg_hr = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(260)]
    )
    calories = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(6000)]
    )
    notes = models.CharField(max_length=1000, null=True, blank=True)
    feeling = models.CharField(max_length=10, choices=Feeling.choices)
    distance_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    pace_min_per_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(60)],
    )
    avg_speed_kmh = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(120)],
    )
    steps = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(200000)]
    )
    is_template = models.BooleanField(default=False)
    template_name = models.CharField(max_length=60, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        ordering = ["-date", "-start_at"]


class ExerciseDef(OwnedModel):
    """`exercise_defs`（動作庫）— contract §2 exercise_defs."""

    class MuscleGroup(models.TextChoices):
        CHEST = "胸部", "胸部"
        BACK = "背部", "背部"
        SHOULDERS = "肩部", "肩部"
        ARMS = "手臂", "手臂"
        LEGS = "腿部", "腿部"
        GLUTES = "臀部", "臀部"
        CORE = "核心", "核心"
        CARDIO = "心肺", "心肺"
        FULL_BODY = "全身", "全身"
        OTHER = "其他", "其他"

    name = models.CharField(max_length=60)
    category = models.CharField(max_length=10, choices=MuscleGroup.choices, db_index=True)
    equipment = models.CharField(max_length=60, null=True, blank=True)
    is_custom = models.BooleanField(default=True)
    notes = models.CharField(max_length=300, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        ordering = ["name"]


class WorkoutExercise(OwnedModel):
    """`workout_exercises`（訓練 × 動作）— contract §2 workout_exercises."""

    workout = models.ForeignKey(Workout, on_delete=models.CASCADE, related_name="exercises")
    exercise_def = models.ForeignKey(
        ExerciseDef, on_delete=models.PROTECT, related_name="workout_exercises"
    )
    order = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    notes = models.CharField(max_length=300, null=True, blank=True)

    class Meta(OwnedModel.Meta):
        ordering = ["workout", "order"]


class WorkoutSet(OwnedModel):
    """`workout_sets`（組數）— contract §2 workout_sets."""

    class Side(models.TextChoices):
        LEFT = "left", "left"
        RIGHT = "right", "right"
        BOTH = "both", "both"

    workout_exercise = models.ForeignKey(
        WorkoutExercise, on_delete=models.CASCADE, related_name="sets"
    )
    order = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    reps = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(1000)]
    )
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(500)],
    )
    rest_sec = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(1800)]
    )
    rpe = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    rir = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    side = models.CharField(max_length=5, choices=Side.choices, null=True, blank=True)
    is_warmup = models.BooleanField(default=False)
    is_working = models.BooleanField(default=True)
    is_pr = models.BooleanField(default=False)

    class Meta(OwnedModel.Meta):
        ordering = ["workout_exercise", "order"]
