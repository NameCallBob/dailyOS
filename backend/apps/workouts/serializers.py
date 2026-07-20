"""
workouts domain serializers.

Field validation notes (see contract/api-design.md §2 workouts 模組):
  - `workout_id` / `exercise_def_id` / `workout_exercise_id`: PrimaryKeyRelatedField
    scoped to the requesting user's own rows (IDOR guard) -- referencing
    another user's workout/exercise_def/workout_exercise resolves to a
    normal validation error, never a leak.
  - Numeric ranges (rpe, rir, avg_hr, calories, distance_km, ...) are
    enforced by the model field validators, surfaced automatically by
    ModelSerializer.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.workouts.models import ExerciseDef, Workout, WorkoutExercise, WorkoutSet


class WorkoutSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Workout
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "start_at",
            "end_at",
            "type",
            "goal",
            "duration_min",
            "rpe",
            "avg_hr",
            "calories",
            "notes",
            "feeling",
            "distance_km",
            "pace_min_per_km",
            "avg_speed_kmh",
            "steps",
            "is_template",
            "template_name",
        ]

    def validate(self, attrs):
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        if end_at is not None and start_at is not None and end_at < start_at:
            raise serializers.ValidationError({"end_at": ["結束時間不能早於開始時間。"]})
        return attrs


class ExerciseDefSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = ExerciseDef
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "name",
            "category",
            "equipment",
            "is_custom",
            "notes",
        ]


class WorkoutExerciseSerializer(BaseModelSerializer):
    workout_id = serializers.PrimaryKeyRelatedField(
        source="workout", queryset=Workout.all_objects.none()
    )
    exercise_def_id = serializers.PrimaryKeyRelatedField(
        source="exercise_def", queryset=ExerciseDef.all_objects.none()
    )

    class Meta(BaseModelSerializer.Meta):
        model = WorkoutExercise
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "workout_id",
            "exercise_def_id",
            "order",
            "notes",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["workout_id"].queryset = Workout.all_objects.filter(user=user)
            self.fields["exercise_def_id"].queryset = ExerciseDef.all_objects.filter(user=user)


class WorkoutSetSerializer(BaseModelSerializer):
    workout_exercise_id = serializers.PrimaryKeyRelatedField(
        source="workout_exercise", queryset=WorkoutExercise.all_objects.none()
    )

    class Meta(BaseModelSerializer.Meta):
        model = WorkoutSet
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "workout_exercise_id",
            "order",
            "reps",
            "weight_kg",
            "rest_sec",
            "rpe",
            "rir",
            "side",
            "is_warmup",
            "is_working",
            "is_pr",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["workout_exercise_id"].queryset = WorkoutExercise.all_objects.filter(
                user=user
            )
