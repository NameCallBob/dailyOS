"""
workouts domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from apps.workouts import views

router = DefaultRouter()
router.register(r"workouts", views.WorkoutViewSet, basename="workouts")
router.register(r"exercise_defs", views.ExerciseDefViewSet, basename="exercise_defs")
router.register(r"workout_exercises", views.WorkoutExerciseViewSet, basename="workout_exercises")
router.register(r"workout_sets", views.WorkoutSetViewSet, basename="workout_sets")

urlpatterns = router.urls
