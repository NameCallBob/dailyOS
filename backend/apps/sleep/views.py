"""
sleep domain viewsets.
"""

from apps.core.viewsets import OwnedModelViewSet
from apps.sleep.models import SleepLog
from apps.sleep.serializers import SleepLogSerializer


class SleepLogViewSet(OwnedModelViewSet):
    queryset = SleepLog.all_objects.all()
    serializer_class = SleepLogSerializer
    filterset_fields = ["date", "pre_sleep_activity", "quality", "morning_energy"]
    search_fields = ["notes"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "date",
        "bedtime",
        "sleep_at",
        "wake_at",
        "hours",
    ]
