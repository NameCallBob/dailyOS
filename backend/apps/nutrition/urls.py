"""
nutrition domain urls -- mounted at /api/v1/ by config/urls.py.

Register each resource's viewset on the router, e.g.:

    router.register(r"tasks", views.TaskViewSet, basename="tasks")
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"meal_logs", views.MealLogViewSet, basename="meal_logs")

urlpatterns = router.urls
