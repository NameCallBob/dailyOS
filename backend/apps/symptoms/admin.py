"""
symptoms admin registrations.
"""

from django.contrib import admin

from .models import SymptomDef, SymptomLog

admin.site.register(SymptomDef)
admin.site.register(SymptomLog)
