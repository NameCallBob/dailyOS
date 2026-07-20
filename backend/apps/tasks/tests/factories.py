import factory
from factory.django import DjangoModelFactory

from apps.accounts.models import User
from apps.tasks.models import Project, Tag, Task


class UserFactory(DjangoModelFactory):
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


class ProjectFactory(DjangoModelFactory):
    class Meta:
        model = Project

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Project {n}")


class TagFactory(DjangoModelFactory):
    class Meta:
        model = Tag

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"tag-{n}")


class TaskFactory(DjangoModelFactory):
    class Meta:
        model = Task

    user = factory.SubFactory(UserFactory)
    title = factory.Sequence(lambda n: f"Task {n}")
