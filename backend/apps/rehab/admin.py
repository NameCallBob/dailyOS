"""
rehab admin registrations.
"""

from django.contrib import admin

from .models import RehabExercise, RehabPlan, RehabSession


@admin.register(RehabPlan)
class RehabPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "active", "start_date", "deleted")
    list_filter = ("active", "deleted")
    search_fields = ("name", "diagnosis")


@admin.register(RehabExercise)
class RehabExerciseAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "rehab_plan", "name", "effective_date", "deleted")
    list_filter = ("deleted",)
    search_fields = ("name",)


@admin.register(RehabSession)
class RehabSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "rehab_plan", "rehab_exercise", "date", "done", "deleted")
    list_filter = ("done", "deleted")
