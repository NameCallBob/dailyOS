from django.contrib import admin

from apps.health_records.models import Activity, Appointment, HealthDocument

admin.site.register(Appointment)
admin.site.register(HealthDocument)
admin.site.register(Activity)
