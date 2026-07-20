"""
calendar admin registrations.
"""

from django.contrib import admin

from apps.calendar.models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "start_at", "end_at", "type", "all_day", "deleted"]
    list_filter = ["type", "all_day", "deleted"]
    search_fields = ["title", "description", "location"]
