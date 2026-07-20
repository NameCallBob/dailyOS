"""
tasks domain viewsets.

Custom actions (contract/api-design.md §2.1, all POST, no body except
`snooze`, all return the full updated record like PATCH):
  - POST /api/v1/tasks/{id}/complete/    -> status=completed, completed_at=now
  - POST /api/v1/tasks/{id}/uncomplete/  -> status=planned, completed_at=null
  - POST /api/v1/tasks/{id}/snooze/      -> { until?: date, days?: int }
"""

import datetime

import django_filters
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet
from apps.tasks.models import Project, Tag, Task
from apps.tasks.serializers import ProjectSerializer, TagSerializer, TaskSerializer


class SnoozeSerializer(drf_serializers.Serializer):
    until = drf_serializers.DateField(required=False, allow_null=True)
    days = drf_serializers.IntegerField(required=False, allow_null=True, min_value=0)


class TaskFilter(django_filters.FilterSet):
    project_id = django_filters.UUIDFilter(field_name="project_id")
    parent_id = django_filters.UUIDFilter(field_name="parent_id")

    class Meta:
        model = Task
        fields = ["status", "priority", "energy", "archived", "project_id", "parent_id"]


class ProjectFilter(django_filters.FilterSet):
    class Meta:
        model = Project
        fields = ["status"]


class TaskViewSet(OwnedModelViewSet):
    queryset = Task.all_objects.all()
    serializer_class = TaskSerializer
    filterset_class = TaskFilter
    search_fields = ["title", "description", "context"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "due_date",
        "scheduled_at",
        "priority",
        "status",
    ]

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task = self.bump_version_and_save(
            task, status=Task.Status.COMPLETED, completed_at=timezone.now()
        )
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        task = self.bump_version_and_save(task, status=Task.Status.PLANNED, completed_at=None)
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def snooze(self, request, pk=None):
        task = self.get_object()
        serializer = SnoozeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        until = serializer.validated_data.get("until")
        days = serializer.validated_data.get("days")

        if until is None:
            base = task.due_date or timezone.localdate()
            until = base + datetime.timedelta(days=days if days is not None else 1)

        task = self.bump_version_and_save(task, due_date=until)
        return Response(self.get_serializer(task).data)


class ProjectViewSet(OwnedModelViewSet):
    queryset = Project.all_objects.all()
    serializer_class = ProjectSerializer
    filterset_class = ProjectFilter
    search_fields = ["name", "description"]
    ordering_fields = ["created_at", "updated_at", "name", "start_date", "target_date"]


class TagViewSet(OwnedModelViewSet):
    queryset = Tag.all_objects.all()
    serializer_class = TagSerializer
    search_fields = ["name"]
    ordering_fields = ["created_at", "updated_at", "name"]
