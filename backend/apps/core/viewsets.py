"""
OwnedModelViewSet: base ViewSet every domain resource viewset should
subclass. Implements the parts of the contract (api-design.md) that are
identical across all 34 resources:

  - owner scoping: `get_queryset()` is always filtered to `request.user`
    (IDOR guard) -- domain viewsets must NOT override this to widen scope.
  - soft delete: `destroy()` sets deleted=True, version+=1, updated_at=now,
    returns 204 (no row is ever actually removed). `list()` excludes
    deleted rows unless the query string carries `?deleted=true`.
  - optimistic-lock counter: every successful create starts version=1;
    every successful update increments version by 1.
  - generic exact-match filtering: any query param whose name matches a
    concrete model field is applied as `.filter(<field>=<value>)`
    (contract §0.4 -- "任意資源自身欄位的精確篩選"), on top of whatever
    `filterset_fields`/`search_fields`/`ordering_fields` a domain viewset
    additionally declares.

Domain viewsets typically only need:

    class TasksViewSet(OwnedModelViewSet):
        queryset = Task.all_objects.all()
        serializer_class = TaskSerializer
        search_fields = ["title", "description"]
        ordering_fields = ["created_at", "updated_at", "due_date"]
"""

from rest_framework import status, viewsets
from rest_framework.response import Response

RESERVED_QUERY_PARAMS = {"page", "page_size", "search", "ordering", "deleted", "format"}


class OwnedModelViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_model(self):
        if getattr(self, "queryset", None) is not None:
            return self.queryset.model
        return self.get_serializer_class().Meta.model

    def get_queryset(self):
        model = self.get_model()
        qs = model.all_objects.filter(user=self.request.user)

        include_deleted = self.request.query_params.get("deleted") == "true"
        if not include_deleted:
            qs = qs.filter(deleted=False)

        return self._apply_field_filters(qs)

    def _apply_field_filters(self, qs):
        model_field_names = {f.name for f in qs.model._meta.get_fields()}
        for key, value in self.request.query_params.items():
            if key in RESERVED_QUERY_PARAMS or key not in model_field_names:
                continue
            qs = qs.filter(**{key: value})
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(version=serializer.instance.version + 1)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.deleted = True
        instance.version += 1
        instance.save(update_fields=["deleted", "version", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def bump_version_and_save(self, instance, **field_updates):
        """Helper for custom @action endpoints (e.g. tasks/{id}/complete/):
        applies field_updates, increments version, saves, and returns the
        instance -- matching the "PATCH-equivalent" response contract in
        api-design.md §0.8 (custom actions return the full updated record).
        """
        for field, value in field_updates.items():
            setattr(instance, field, value)
        instance.version += 1
        instance.save()
        return instance
