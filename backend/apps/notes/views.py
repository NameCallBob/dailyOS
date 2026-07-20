"""
notes domain viewsets.

Endpoints (contract/api-design.md §2.2 + §0.3/§0.8):

    GET    /api/v1/notes/
    POST   /api/v1/notes/
    GET    /api/v1/notes/{id}/
    PATCH  /api/v1/notes/{id}/
    DELETE /api/v1/notes/{id}/
    POST   /api/v1/notes/{id}/toggle_favorite/   -> flips `pinned`
    POST   /api/v1/notes/{id}/restore/           -> deleted -> false

    GET    /api/v1/note_versions/
    POST   /api/v1/note_versions/
    GET    /api/v1/note_versions/{id}/
    PATCH  /api/v1/note_versions/{id}/
    DELETE /api/v1/note_versions/{id}/
"""

from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet

from .models import Note, NoteVersion, NoteVersionReason
from .serializers import NoteSerializer, NoteVersionSerializer


class NoteViewSet(OwnedModelViewSet):
    queryset = Note.all_objects.all()
    serializer_class = NoteSerializer
    search_fields = ["title", "content", "folder"]
    ordering_fields = ["created_at", "updated_at", "title", "pinned", "daily_date"]
    filterset_fields = ["folder", "pinned", "is_daily", "project_id", "task_id"]

    def perform_update(self, serializer):
        # Contract: "筆記不得無聲覆蓋" -- every PATCH must preserve a
        # snapshot of the pre-update content so nothing is silently lost.
        note = serializer.instance
        NoteVersion.objects.create(
            user=note.user,
            note=note,
            title=note.title,
            content=note.content,
            folder=note.folder,
            tags=note.tags,
            reason=NoteVersionReason.AUTO_SNAPSHOT,
            note_version_at_snapshot=note.version,
        )
        super().perform_update(serializer)

    @action(detail=True, methods=["post"])
    def toggle_favorite(self, request, pk=None):
        note = self.get_object()
        note = self.bump_version_and_save(note, pinned=not note.pinned)
        return Response(self.get_serializer(note).data)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        # Deleted notes are excluded from get_queryset() by default, so the
        # trash/restore UI's lookup must explicitly include them.
        note = get_object_or_404(Note.all_objects, pk=pk, user=request.user)
        note = self.bump_version_and_save(note, deleted=False)
        return Response(self.get_serializer(note).data)


class NoteVersionViewSet(OwnedModelViewSet):
    queryset = NoteVersion.all_objects.all()
    serializer_class = NoteVersionSerializer
    search_fields = ["title", "content", "folder"]
    ordering_fields = ["created_at", "updated_at", "note_version_at_snapshot"]
    filterset_fields = ["note", "reason"]
