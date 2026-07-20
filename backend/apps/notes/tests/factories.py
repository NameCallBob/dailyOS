import factory
from django.contrib.auth import get_user_model

from apps.notes.models import Note, NoteVersion, NoteVersionReason

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"notes-user-{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or "S3curePassw0rd!")
        if create:
            self.save()


class NoteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Note

    user = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Note {n}")
    content = "# Hello"
    folder = ""
    tags = factory.LazyFunction(list)
    pinned = False
    is_daily = False
    daily_date = None


class NoteVersionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = NoteVersion

    user = factory.SelfAttribute("note.user")
    note = factory.SubFactory(NoteFactory)
    title = factory.SelfAttribute("note.title")
    content = factory.SelfAttribute("note.content")
    folder = ""
    tags = factory.LazyFunction(list)
    reason = NoteVersionReason.MANUAL_SAVE
    note_version_at_snapshot = 1
