import factory
from django.contrib.auth import get_user_model

from apps.body.models import BodyMetrics, WaterLog

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"body-user-{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class BodyMetricsFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BodyMetrics

    user = factory.SubFactory(UserFactory)
    date = "2026-07-20"
    logged_at = "2026-07-20T08:00:00Z"
    weight_kg = "70.50"
    source = "manual"


class WaterLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WaterLog

    user = factory.SubFactory(UserFactory)
    date = "2026-07-20"
    logged_at = "2026-07-20T08:00:00Z"
    amount_ml = "250.00"
    source = "manual"
