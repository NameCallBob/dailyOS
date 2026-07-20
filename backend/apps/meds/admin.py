"""
meds admin registrations.
"""

from django.contrib import admin

from apps.meds.models import Medication, MedicationLog, MedicationSchedule, Supplement

admin.site.register(Medication)
admin.site.register(Supplement)
admin.site.register(MedicationSchedule)
admin.site.register(MedicationLog)
