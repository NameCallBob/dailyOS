"""factory_boy factories for the habits app tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.habits.models import Habit, HabitLog


class UserFactory(factory.django.DjangoModelFactory):
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


class HabitFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Habit

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Habit {n}")
    icon = "🏃"
    type = "boolean"
    unit = None
    target_value = 1
    increment = 1
    schedule = factory.LazyFunction(lambda: {"type": "daily"})
    reminder_time = None
    archived = False
    notes = None
    sort_order = factory.Sequence(lambda n: n)


class HabitLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HabitLog

    habit = factory.SubFactory(HabitFactory)
    user = factory.SelfAttribute("habit.user")
    date = factory.LazyFunction(lambda: timezone.now().date())
    value = 1
    note = None
    logged_at = factory.LazyFunction(timezone.now)
