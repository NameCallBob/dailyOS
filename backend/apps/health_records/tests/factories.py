import factory
from django.contrib.auth import get_user_model

from apps.health_records.models import Activity, Appointment, HealthDocument

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"health-records-user-{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class AppointmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Appointment

    user = factory.SubFactory(UserFactory)
    start_at = "2026-08-01T09:00:00Z"
    location = "台大醫院"
    status = "scheduled"
    follow_up_needed = False


class HealthDocumentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = HealthDocument

    user = factory.SubFactory(UserFactory)
    date = "2026-07-20"
    category = "檢驗報告"
    title = "血液檢查報告"


class ActivityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Activity

    user = factory.SubFactory(UserFactory)
    type = "daily_summary"
    occurred_at = "2026-07-20T00:00:00Z"
    date = "2026-07-20"
    source = "manual"
    is_primary = True
