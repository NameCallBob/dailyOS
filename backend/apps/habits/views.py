"""
habits domain viewsets.

Endpoints (contract/api-design.md §2.2, §0.8):
  - standard CRUD for ``habits`` and ``habit_logs`` via OwnedModelViewSet.
  - ``POST /api/v1/habits/{id}/archive/`` -- toggles ``archived``.
"""

import django_filters
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet

from .models import Habit, HabitLog
from .serializers import HabitLogSerializer, HabitSerializer


class HabitViewSet(OwnedModelViewSet):
    queryset = Habit.all_objects.all()
    serializer_class = HabitSerializer
    filterset_fields = ["type", "archived"]
    search_fields = ["name", "notes"]
    ordering_fields = ["created_at", "updated_at", "sort_order", "name"]

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        instance = self.get_object()
        instance = self.bump_version_and_save(instance, archived=not instance.archived)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class HabitLogFilterSet(django_filters.FilterSet):
    # DB column is `habit_id`; expose that name so `?habit_id=` (the
    # contract's snake_case field name) filters correctly.
    habit_id = django_filters.CharFilter(field_name="habit_id")

    class Meta:
        model = HabitLog
        fields = ["habit_id", "date"]


class HabitLogViewSet(OwnedModelViewSet):
    queryset = HabitLog.all_objects.all()
    serializer_class = HabitLogSerializer
    filterset_class = HabitLogFilterSet
    search_fields = ["note"]
    ordering_fields = ["created_at", "updated_at", "date", "logged_at"]
