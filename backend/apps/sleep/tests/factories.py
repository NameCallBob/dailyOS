"""factory_boy factories for sleep tests."""

import datetime

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.sleep.models import SleepLog


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class SleepLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SleepLog

    user = factory.SubFactory(UserFactory)
    date = factory.LazyFunction(lambda: timezone.now().date())
    bedtime = factory.LazyFunction(
        lambda: timezone.now().replace(hour=22, minute=0, second=0, microsecond=0)
    )
    sleep_at = factory.LazyFunction(
        lambda: timezone.now().replace(hour=22, minute=30, second=0, microsecond=0)
    )
    wake_at = factory.LazyFunction(
        lambda: timezone.now().replace(hour=22, minute=30, second=0, microsecond=0)
        + datetime.timedelta(hours=7)
    )
    hours = "7.00"
    awakenings = 0
    quality = 4
    morning_energy = 4
    pre_sleep_activity = SleepLog.PreSleepActivity.NONE
    notes = ""
