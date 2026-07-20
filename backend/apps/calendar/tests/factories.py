import factory
from django.contrib.auth import get_user_model

from apps.calendar.models import CalendarEvent

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"calendar-user-{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class CalendarEventFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CalendarEvent

    user = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Event {n}")
    description = ""
    start_at = "2026-07-20T09:00:00Z"
    end_at = "2026-07-20T10:00:00Z"
    all_day = False
    tz = "Asia/Taipei"
    type = "meeting"
