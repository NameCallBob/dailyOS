"""
calendar domain urls -- mounted at /api/v1/ by config/urls.py.

Register each resource's viewset on the router, e.g.:

    router.register(r"tasks", views.TaskViewSet, basename="tasks")
"""

from rest_framework.routers import DefaultRouter

from apps.calendar import views

router = DefaultRouter()
router.register(r"calendar_events", views.CalendarEventViewSet, basename="calendar_events")

urlpatterns = router.urls
