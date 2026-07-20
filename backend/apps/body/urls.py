"""
body domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"body_metrics", views.BodyMetricsViewSet, basename="body_metrics")
router.register(r"water_logs", views.WaterLogViewSet, basename="water_logs")

urlpatterns = router.urls
