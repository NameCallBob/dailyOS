"""
health_records domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from apps.health_records import views

router = DefaultRouter()
router.register(r"health_documents", views.HealthDocumentViewSet, basename="health_documents")
router.register(r"appointments", views.AppointmentViewSet, basename="appointments")
router.register(r"activities", views.ActivityViewSet, basename="activities")

urlpatterns = router.urls
