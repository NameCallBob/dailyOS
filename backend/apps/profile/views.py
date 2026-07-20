"""
profile domain viewsets.

Subclass apps.core.viewsets.OwnedModelViewSet, e.g.:

    from apps.core.viewsets import OwnedModelViewSet

    class TaskViewSet(OwnedModelViewSet):
        queryset = Task.all_objects.all()
        serializer_class = TaskSerializer
        search_fields = [...]
        ordering_fields = [...]
"""

from apps.core.viewsets import OwnedModelViewSet  # noqa: F401
