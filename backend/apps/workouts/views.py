"""
workouts domain viewsets.

Contract (contract/api-design.md §2 workouts 模組) defines no custom action
for this module's resources; every resource gets the standard 5 CRUD
endpoints. `toggle-pr` on workout_sets is an additive, non-breaking helper
mirroring the toggle-* pattern used elsewhere in the contract (e.g.
medications/toggle-active) -- it does not replace or alter any contracted
endpoint.

  - POST /api/v1/workout_sets/{id}/toggle-pr/  -> flips `is_pr`
"""

import django_filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet
from apps.workouts.models import ExerciseDef, Workout, WorkoutExercise, WorkoutSet
from apps.workouts.serializers import (
    ExerciseDefSerializer,
    WorkoutExerciseSerializer,
    WorkoutSerializer,
    WorkoutSetSerializer,
)


class WorkoutFilter(django_filters.FilterSet):
    class Meta:
        model = Workout
        fields = ["type", "feeling", "date", "is_template"]


class WorkoutViewSet(OwnedModelViewSet):
    queryset = Workout.all_objects.all()
    serializer_class = WorkoutSerializer
    filterset_class = WorkoutFilter
    search_fields = ["goal", "notes", "template_name"]
    ordering_fields = ["created_at", "updated_at", "date", "start_at", "duration_min", "rpe"]


class ExerciseDefFilter(django_filters.FilterSet):
    class Meta:
        model = ExerciseDef
        fields = ["category", "is_custom"]


class ExerciseDefViewSet(OwnedModelViewSet):
    queryset = ExerciseDef.all_objects.all()
    serializer_class = ExerciseDefSerializer
    filterset_class = ExerciseDefFilter
    search_fields = ["name", "equipment", "notes"]
    ordering_fields = ["created_at", "updated_at", "name", "category"]


class WorkoutExerciseFilter(django_filters.FilterSet):
    workout_id = django_filters.UUIDFilter(field_name="workout_id")
    exercise_def_id = django_filters.UUIDFilter(field_name="exercise_def_id")

    class Meta:
        model = WorkoutExercise
        fields = ["workout_id", "exercise_def_id"]


class WorkoutExerciseViewSet(OwnedModelViewSet):
    queryset = WorkoutExercise.all_objects.all()
    serializer_class = WorkoutExerciseSerializer
    filterset_class = WorkoutExerciseFilter
    search_fields = ["notes"]
    ordering_fields = ["created_at", "updated_at", "order"]


class WorkoutSetFilter(django_filters.FilterSet):
    workout_exercise_id = django_filters.UUIDFilter(field_name="workout_exercise_id")

    class Meta:
        model = WorkoutSet
        fields = ["workout_exercise_id", "is_pr", "is_warmup", "is_working", "side"]


class WorkoutSetViewSet(OwnedModelViewSet):
    queryset = WorkoutSet.all_objects.all()
    serializer_class = WorkoutSetSerializer
    filterset_class = WorkoutSetFilter
    ordering_fields = ["created_at", "updated_at", "order", "weight_kg", "reps"]

    @action(detail=True, methods=["post"], url_path="toggle-pr")
    def toggle_pr(self, request, pk=None):
        workout_set = self.get_object()
        workout_set = self.bump_version_and_save(workout_set, is_pr=not workout_set.is_pr)
        return Response(self.get_serializer(workout_set).data)
