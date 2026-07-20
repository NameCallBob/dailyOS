"""factory_boy factories for the meds app tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.meds.models import Medication, MedicationLog, MedicationSchedule, Supplement


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class MedicationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Medication

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Medication {n}")
    dose = 1
    unit = "mg"
    frequency = "daily"
    days_of_week = factory.LazyFunction(list)
    interval_days = None
    times = factory.LazyFunction(lambda: ["08:00"])
    start_date = factory.LazyFunction(lambda: timezone.now().date())
    end_date = None
    with_food = "either"
    remaining_qty = None
    refill_reminder = factory.LazyFunction(dict)
    active = True
    notes = None


class SupplementFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Supplement

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Supplement {n}")
    dose = 1
    unit = "capsule"
    frequency = "daily"
    days_of_week = factory.LazyFunction(list)
    interval_days = None
    times = factory.LazyFunction(lambda: ["08:00"])
    start_date = factory.LazyFunction(lambda: timezone.now().date())
    end_date = None
    with_food = "either"
    remaining_qty = None
    refill_reminder = factory.LazyFunction(dict)
    active = True
    notes = None


class MedicationScheduleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MedicationSchedule
        exclude = ("medication",)

    medication = factory.SubFactory(MedicationFactory)
    user = factory.SelfAttribute("medication.user")
    medication_id = factory.SelfAttribute("medication.id")
    source_type = "medication"
    time_of_day = "08:00"
    label = None
    active = True


class MedicationLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MedicationLog
        exclude = ("medication",)

    medication = factory.SubFactory(MedicationFactory)
    user = factory.SelfAttribute("medication.user")
    medication_id = factory.SelfAttribute("medication.id")
    source_type = "medication"
    schedule = None
    scheduled_for = factory.LazyFunction(timezone.now)
    status = "taken"
    taken_at = factory.LazyFunction(timezone.now)
    quantity = 1
    note = None
