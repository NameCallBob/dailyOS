from django.contrib import admin

from .models import BodyMetrics, WaterLog

admin.site.register(BodyMetrics)
admin.site.register(WaterLog)
