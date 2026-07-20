"""factory_boy factories for symptoms app tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.symptoms.models import SymptomDef, SymptomLog


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


class SymptomDefFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SymptomDef

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"症狀 {n}")
    category = SymptomDef.Category.PAIN
    note = None
    archived = False


class SymptomLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SymptomLog

    user = factory.SubFactory(UserFactory)
    symptom_def = factory.SubFactory(SymptomDefFactory)
    date = factory.LazyFunction(lambda: timezone.now().date())
    start_at = factory.LazyFunction(timezone.now)
    intensity = 5
    body_location = None
    duration_min = None
    triggers = factory.LazyFunction(list)
    relief = factory.LazyFunction(list)
    notes = None
    photo = None
