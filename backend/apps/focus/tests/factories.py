"""factory_boy factories for apps.focus tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.focus.models import TimeEntry, TimerSession


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class TimerSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TimerSession

    user = factory.SubFactory(UserFactory)
    label = factory.Sequence(lambda n: f"Session {n}")
    category = "deep_work"
    status = "running"
    mode = "stopwatch"
    session_start_at = factory.LazyFunction(timezone.now)
    started_at = factory.LazyFunction(timezone.now)


class TimeEntryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TimeEntry

    user = factory.SubFactory(UserFactory)
    label = factory.Sequence(lambda n: f"Entry {n}")
    category = "deep_work"
    start_at = factory.LazyFunction(timezone.now)
    end_at = factory.LazyFunction(timezone.now)
    duration_seconds = 600
    source = "manual"
