"""
nutrition admin registrations.

    from django.contrib import admin
    from apps.nutrition.models import Task

    admin.site.register(Task)
"""

from django.contrib import admin

from apps.nutrition.models import MealLog

admin.site.register(MealLog)
