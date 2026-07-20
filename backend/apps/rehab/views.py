"""
rehab domain viewsets.

Endpoints (contract/api-design.md §2.3, §0.8):
  - standard CRUD for ``rehab_plans`` / ``rehab_exercises`` /
    ``rehab_sessions`` via OwnedModelViewSet.
  - ``POST /api/v1/rehab_plans/{id}/toggle-active/`` -- toggles ``active``.
  - ``POST /api/v1/rehab_sessions/{id}/toggle-done/`` -- toggles ``done``
    without touching any other actual-value field.
"""

from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet

from .models import RehabExercise, RehabPlan, RehabSession
from .serializers import RehabExerciseSerializer, RehabPlanSerializer, RehabSessionSerializer


class RehabPlanViewSet(OwnedModelViewSet):
    queryset = RehabPlan.all_objects.all()
    serializer_class = RehabPlanSerializer
    filterset_fields = ["active", "body_region"]
    search_fields = ["name", "diagnosis", "goal", "therapist_name", "clinic_name"]
    ordering_fields = ["created_at", "updated_at", "start_date", "next_appointment_at"]

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        instance = self.get_object()
        instance = self.bump_version_and_save(instance, active=not instance.active)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class RehabExerciseViewSet(OwnedModelViewSet):
    queryset = RehabExercise.all_objects.all()
    serializer_class = RehabExerciseSerializer
    filterset_fields = ["rehab_plan"]
    search_fields = ["name", "instructions", "cautions", "therapist_note"]
    ordering_fields = ["created_at", "updated_at", "effective_date", "order"]


class RehabSessionViewSet(OwnedModelViewSet):
    queryset = RehabSession.all_objects.all()
    serializer_class = RehabSessionSerializer
    filterset_fields = ["rehab_plan", "rehab_exercise", "date", "done"]
    search_fields = ["notes"]
    ordering_fields = ["created_at", "updated_at", "date"]

    @action(detail=True, methods=["post"], url_path="toggle-done")
    def toggle_done(self, request, pk=None):
        instance = self.get_object()
        instance = self.bump_version_and_save(instance, done=not instance.done)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
