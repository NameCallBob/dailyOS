"""
focus domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"timer_sessions", views.TimerSessionViewSet, basename="timer_sessions")
router.register(r"time_entries", views.TimeEntryViewSet, basename="time_entries")

urlpatterns = router.urls
