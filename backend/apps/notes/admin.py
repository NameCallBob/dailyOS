"""notes admin registrations."""

from django.contrib import admin

from .models import Note, NoteVersion


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "folder", "pinned", "is_daily", "deleted", "version")
    list_filter = ("pinned", "is_daily", "deleted")
    search_fields = ("title", "content")


@admin.register(NoteVersion)
class NoteVersionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "note", "reason", "note_version_at_snapshot", "deleted")
    list_filter = ("reason", "deleted")
