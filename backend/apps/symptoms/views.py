"""
symptoms domain viewsets.

No custom actions defined for this app in the contract (see
contract/api-design.md §"symptom_logs": "本資源不提供任何自動診斷／風險評分
欄位或邏輯") -- both resources use the standard CRUD + filter/search/
ordering/page surface provided by OwnedModelViewSet.
"""

from apps.core.viewsets import OwnedModelViewSet

from .models import SymptomDef, SymptomLog
from .serializers import SymptomDefSerializer, SymptomLogSerializer


class SymptomDefViewSet(OwnedModelViewSet):
    queryset = SymptomDef.all_objects.all()
    serializer_class = SymptomDefSerializer
    filterset_fields = ["category", "archived"]
    search_fields = ["name", "note"]
    ordering_fields = ["created_at", "updated_at", "name"]


class SymptomLogViewSet(OwnedModelViewSet):
    queryset = SymptomLog.all_objects.all()
    serializer_class = SymptomLogSerializer
    filterset_fields = ["symptom_def", "date"]
    search_fields = ["notes", "body_location"]
    ordering_fields = ["created_at", "updated_at", "date", "start_at", "intensity"]
