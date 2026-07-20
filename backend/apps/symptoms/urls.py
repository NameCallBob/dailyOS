"""
symptoms domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"symptom_defs", views.SymptomDefViewSet, basename="symptom_defs")
router.register(r"symptom_logs", views.SymptomLogViewSet, basename="symptom_logs")

urlpatterns = router.urls
