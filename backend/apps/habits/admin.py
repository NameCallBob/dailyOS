"""
habits admin registrations.
"""

from django.contrib import admin

from .models import Habit, HabitLog


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "type", "archived", "sort_order", "deleted")
    list_filter = ("type", "archived", "deleted")
    search_fields = ("name",)


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "habit", "date", "value", "deleted")
    list_filter = ("deleted",)
