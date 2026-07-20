"""
sleep admin registrations.
"""

from django.contrib import admin

from apps.sleep.models import SleepLog

admin.site.register(SleepLog)
