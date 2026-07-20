"""
habits domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"habits", views.HabitViewSet, basename="habits")
router.register(r"habit_logs", views.HabitLogViewSet, basename="habit_logs")

urlpatterns = router.urls
