from django.contrib import admin

from .models import TimeEntry, TimerSession


@admin.register(TimerSession)
class TimerSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "label", "status", "category", "created_at")
    list_filter = ("status", "category", "mode")
    search_fields = ("label", "note")


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "label", "source", "duration_seconds", "start_at")
    list_filter = ("category", "source")
    search_fields = ("label", "note")
