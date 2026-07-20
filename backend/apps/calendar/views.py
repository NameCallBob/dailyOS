"""
calendar domain viewsets.

Endpoints (contract/api-design.md, contract/openapi.yaml paths
`/api/v1/calendar_events/` & `/api/v1/calendar_events/{id}/`): standard
CRUD only -- the frozen contract defines no custom action for this
resource.
"""

from apps.calendar.models import CalendarEvent
from apps.calendar.serializers import CalendarEventSerializer
from apps.core.viewsets import OwnedModelViewSet


class CalendarEventViewSet(OwnedModelViewSet):
    queryset = CalendarEvent.all_objects.all()
    serializer_class = CalendarEventSerializer
    search_fields = ["title", "description", "location"]
    ordering_fields = ["created_at", "updated_at", "start_at", "end_at", "title"]
    filterset_fields = ["type", "all_day", "task_id"]
