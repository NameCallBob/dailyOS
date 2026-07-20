import factory
from factory.django import DjangoModelFactory

from apps.accounts.models import User
from apps.workouts.models import ExerciseDef, Workout, WorkoutExercise, WorkoutSet


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class WorkoutFactory(DjangoModelFactory):
    class Meta:
        model = Workout

    user = factory.SubFactory(UserFactory)
    date = "2026-07-20"
    start_at = "2026-07-20T08:00:00Z"
    type = Workout.WorkoutType.STRENGTH
    duration_min = 60
    feeling = Workout.Feeling.GOOD


class ExerciseDefFactory(DjangoModelFactory):
    class Meta:
        model = ExerciseDef

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Exercise {n}")
    category = ExerciseDef.MuscleGroup.CHEST


class WorkoutExerciseFactory(DjangoModelFactory):
    class Meta:
        model = WorkoutExercise

    user = factory.SubFactory(UserFactory)
    workout = factory.SubFactory(WorkoutFactory)
    exercise_def = factory.SubFactory(ExerciseDefFactory)
    order = 0


class WorkoutSetFactory(DjangoModelFactory):
    class Meta:
        model = WorkoutSet

    user = factory.SubFactory(UserFactory)
    workout_exercise = factory.SubFactory(WorkoutExerciseFactory)
    order = 0
    reps = 10
    weight_kg = 40
