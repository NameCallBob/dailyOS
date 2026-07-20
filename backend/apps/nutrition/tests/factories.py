"""factory_boy factories for nutrition tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.nutrition.models import MealLog


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class MealLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = MealLog

    user = factory.SubFactory(UserFactory)
    date = factory.LazyFunction(lambda: timezone.now().date())
    logged_at = factory.LazyFunction(timezone.now)
    type = "lunch"
    text = factory.Sequence(lambda n: f"meal {n}")
    food_tags = factory.LazyFunction(list)
    custom_nutrients = factory.LazyFunction(list)
