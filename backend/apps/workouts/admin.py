"""
workouts admin registrations.
"""

from django.contrib import admin

from apps.workouts.models import ExerciseDef, Workout, WorkoutExercise, WorkoutSet

admin.site.register(Workout)
admin.site.register(ExerciseDef)
admin.site.register(WorkoutExercise)
admin.site.register(WorkoutSet)
