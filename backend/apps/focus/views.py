"""
focus domain viewsets.

Custom actions (contract/api-design.md §2.1 timer_sessions, no request
body, return the full updated record):

    POST /api/v1/timer_sessions/{id}/pause/
    POST /api/v1/timer_sessions/{id}/resume/
    POST /api/v1/timer_sessions/{id}/stop/
    POST /api/v1/timer_sessions/{id}/cancel/
"""

import django_filters
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet

from .models import TimeEntry, TimerSession
from .serializers import TimeEntrySerializer, TimerSessionSerializer


class TimeEntryFilterSet(django_filters.FilterSet):
    timer_session_id = django_filters.UUIDFilter(field_name="timer_session_id")

    class Meta:
        model = TimeEntry
        fields = ["category", "source", "task_id", "project_id", "timer_session_id"]


def _elapsed_seconds(started_at, now):
    return max(0, int((now - started_at).total_seconds()))


class TimerSessionViewSet(OwnedModelViewSet):
    queryset = TimerSession.all_objects.all()
    serializer_class = TimerSessionSerializer
    filterset_fields = ["status", "category", "mode", "task_id", "project_id"]
    search_fields = ["label", "note"]
    ordering_fields = ["created_at", "updated_at", "session_start_at", "status"]

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        instance = self.get_object()
        if instance.status != "running":
            raise ValidationError({"status": ["僅 status=running 時可執行 pause。"]})
        now = timezone.now()
        elapsed = _elapsed_seconds(instance.started_at, now)
        instance = self.bump_version_and_save(
            instance,
            accumulated_seconds=instance.accumulated_seconds + elapsed,
            status="paused",
            started_at=None,
            paused_at=now,
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        instance = self.get_object()
        if instance.status != "paused":
            raise ValidationError({"status": ["僅 status=paused 時可執行 resume。"]})
        now = timezone.now()
        instance = self.bump_version_and_save(
            instance,
            status="running",
            started_at=now,
            paused_at=None,
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def stop(self, request, pk=None):
        instance = self.get_object()
        if instance.status not in ("running", "paused"):
            raise ValidationError({"status": ["僅 status∈{running,paused} 時可執行 stop。"]})
        now = timezone.now()
        accumulated_seconds = instance.accumulated_seconds
        if instance.status == "running":
            accumulated_seconds += _elapsed_seconds(instance.started_at, now)
        instance = self.bump_version_and_save(
            instance,
            accumulated_seconds=accumulated_seconds,
            status="completed",
            started_at=None,
            completed_at=now,
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        instance = self.get_object()
        if instance.status not in ("running", "paused"):
            raise ValidationError({"status": ["僅 status∈{running,paused} 時可執行 cancel。"]})
        now = timezone.now()
        instance = self.bump_version_and_save(
            instance,
            status="cancelled",
            started_at=None,
            completed_at=now,
        )
        return Response(self.get_serializer(instance).data)


class TimeEntryViewSet(OwnedModelViewSet):
    queryset = TimeEntry.all_objects.all()
    serializer_class = TimeEntrySerializer
    filterset_class = TimeEntryFilterSet
    search_fields = ["label", "note"]
    ordering_fields = ["created_at", "updated_at", "start_at", "end_at", "duration_seconds"]
