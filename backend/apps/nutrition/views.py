"""
nutrition domain viewsets.
"""

from apps.core.viewsets import OwnedModelViewSet

from .models import MealLog
from .serializers import MealLogSerializer


class MealLogViewSet(OwnedModelViewSet):
    queryset = MealLog.all_objects.all()
    serializer_class = MealLogSerializer
    filterset_fields = ["type", "date"]
    search_fields = ["text", "portion", "notes"]
    ordering_fields = ["created_at", "updated_at", "date", "logged_at"]
