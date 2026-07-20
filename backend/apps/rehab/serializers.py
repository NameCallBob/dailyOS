"""
rehab domain serializers.

Field validation notes (see contract/api-design.md §2.3):
  - `rehab_plan_id` / `rehab_exercise_id`: PrimaryKeyRelatedField scoped to
    the requesting user's own rows (IDOR guard) -- referencing another
    user's plan/exercise resolves to a normal validation error, never a
    leak.
  - Numeric ranges (`sets` 0-50, `reps` 0-500, `duration_sec` 0-7200,
    `discomfort_before`/`discomfort_after` 0-10, etc.) are enforced via
    explicit `min_value`/`max_value` on the serializer fields.
  - `RehabSessionSerializer.validate()` cross-checks that
    `rehab_exercise.rehab_plan == rehab_plan` so a session can never be
    filed against an exercise from a different plan.
  - `sets`/`reps`/`duration_sec`/`load_limit`/`angle`/`frequency` on
    `rehab_exercises` are plain writable fields, changed only by explicit
    user PATCH -- no auto-adjust logic exists anywhere in this app.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import RehabExercise, RehabPlan, RehabSession


class ReviewNoteSerializer(serializers.Serializer):
    id = serializers.CharField()
    date = serializers.DateField()
    note = serializers.CharField()
    adjustment = serializers.BooleanField(required=False)


class RehabPlanSerializer(BaseModelSerializer):
    review_notes = ReviewNoteSerializer(many=True, required=False)

    class Meta(BaseModelSerializer.Meta):
        model = RehabPlan
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "name",
            "body_region",
            "diagnosis",
            "goal",
            "therapist_name",
            "clinic_name",
            "active",
            "start_date",
            "next_appointment_at",
            "general_cautions",
            "review_notes",
            "note",
        ]


class RehabExerciseSerializer(BaseModelSerializer):
    rehab_plan_id = serializers.PrimaryKeyRelatedField(
        source="rehab_plan", queryset=RehabPlan.all_objects.none()
    )
    sets = serializers.IntegerField(min_value=0, max_value=50, required=False, allow_null=True)
    reps = serializers.IntegerField(min_value=0, max_value=500, required=False, allow_null=True)
    duration_sec = serializers.IntegerField(
        min_value=0, max_value=7200, required=False, allow_null=True
    )

    class Meta(BaseModelSerializer.Meta):
        model = RehabExercise
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "rehab_plan_id",
            "name",
            "instructions",
            "media",
            "sets",
            "reps",
            "duration_sec",
            "load_limit",
            "angle",
            "cautions",
            "frequency",
            "therapist_note",
            "effective_date",
            "stop_date",
            "order",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["rehab_plan_id"].queryset = RehabPlan.all_objects.filter(user=user)


class RehabSessionSerializer(BaseModelSerializer):
    rehab_plan_id = serializers.PrimaryKeyRelatedField(
        source="rehab_plan", queryset=RehabPlan.all_objects.none()
    )
    rehab_exercise_id = serializers.PrimaryKeyRelatedField(
        source="rehab_exercise", queryset=RehabExercise.all_objects.none()
    )
    actual_sets = serializers.IntegerField(
        min_value=0, max_value=50, required=False, allow_null=True
    )
    actual_reps = serializers.IntegerField(
        min_value=0, max_value=500, required=False, allow_null=True
    )
    actual_time = serializers.IntegerField(
        min_value=0, max_value=7200, required=False, allow_null=True
    )
    discomfort_before = serializers.IntegerField(
        min_value=0, max_value=10, required=False, allow_null=True
    )
    discomfort_after = serializers.IntegerField(
        min_value=0, max_value=10, required=False, allow_null=True
    )

    class Meta(BaseModelSerializer.Meta):
        model = RehabSession
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "rehab_plan_id",
            "rehab_exercise_id",
            "date",
            "done",
            "actual_sets",
            "actual_reps",
            "actual_time",
            "discomfort_before",
            "discomfort_after",
            "load",
            "notes",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["rehab_plan_id"].queryset = RehabPlan.all_objects.filter(user=user)
            self.fields["rehab_exercise_id"].queryset = RehabExercise.all_objects.filter(user=user)

    def validate(self, attrs):
        instance = self.instance
        rehab_plan = attrs.get("rehab_plan", instance.rehab_plan if instance is not None else None)
        rehab_exercise = attrs.get(
            "rehab_exercise", instance.rehab_exercise if instance is not None else None
        )
        if (
            rehab_plan is not None
            and rehab_exercise is not None
            and rehab_exercise.rehab_plan_id != rehab_plan.id
        ):
            raise serializers.ValidationError(
                {"rehab_exercise_id": ["復健項目與所選的復健計畫不相符。"]}
            )
        return attrs
