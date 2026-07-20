"""
body domain viewsets.

contract/api-design.md §0.4: list/create/retrieve/update/destroy + filter/
search/ordering/page for every resource.
"""

from apps.core.viewsets import OwnedModelViewSet

from .models import BodyMetrics, WaterLog
from .serializers import BodyMetricsSerializer, WaterLogSerializer


class BodyMetricsViewSet(OwnedModelViewSet):
    queryset = BodyMetrics.all_objects.all()
    serializer_class = BodyMetricsSerializer
    filterset_fields = ["date", "source"]
    search_fields = ["note"]
    ordering_fields = ["date", "logged_at", "created_at", "updated_at", "weight_kg"]


class WaterLogViewSet(OwnedModelViewSet):
    queryset = WaterLog.all_objects.all()
    serializer_class = WaterLogSerializer
    filterset_fields = ["date", "source"]
    search_fields = ["note", "container_label"]
    ordering_fields = ["date", "logged_at", "created_at", "updated_at", "amount_ml"]
