"""
rehab domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"rehab_plans", views.RehabPlanViewSet, basename="rehab_plans")
router.register(r"rehab_exercises", views.RehabExerciseViewSet, basename="rehab_exercises")
router.register(r"rehab_sessions", views.RehabSessionViewSet, basename="rehab_sessions")

urlpatterns = router.urls
