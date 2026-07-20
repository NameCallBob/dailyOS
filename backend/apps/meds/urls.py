"""
meds domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"medications", views.MedicationViewSet, basename="medications")
router.register(r"supplements", views.SupplementViewSet, basename="supplements")
router.register(
    r"medication_schedules",
    views.MedicationScheduleViewSet,
    basename="medication_schedules",
)
router.register(r"medication_logs", views.MedicationLogViewSet, basename="medication_logs")

urlpatterns = router.urls
