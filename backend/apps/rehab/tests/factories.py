"""factory_boy factories for the rehab app tests."""

import factory
from django.utils import timezone

from apps.accounts.models import User
from apps.rehab.models import RehabExercise, RehabPlan, RehabSession


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


class RehabPlanFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RehabPlan

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Plan {n}")
    body_region = "膝關節"
    diagnosis = "ACL 術後"
    goal = "恢復行走能力"
    therapist_name = "王治療師"
    clinic_name = "健康復健診所"
    active = True
    start_date = factory.LazyFunction(lambda: timezone.now().date())
    next_appointment_at = None
    general_cautions = None
    review_notes = factory.LazyFunction(list)
    note = None


class RehabExerciseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RehabExercise

    user = factory.SelfAttribute("rehab_plan.user")
    rehab_plan = factory.SubFactory(RehabPlanFactory)
    name = factory.Sequence(lambda n: f"Exercise {n}")
    instructions = "每日執行"
    sets = 3
    reps = 10
    duration_sec = 30
    effective_date = factory.LazyFunction(lambda: timezone.now().date())
    order = 1


class RehabSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RehabSession

    user = factory.SelfAttribute("rehab_plan.user")
    rehab_plan = factory.SubFactory(RehabPlanFactory)
    rehab_exercise = factory.LazyAttribute(lambda o: RehabExerciseFactory(rehab_plan=o.rehab_plan))
    date = factory.LazyFunction(lambda: timezone.now().date())
    done = False
    actual_sets = None
    actual_reps = None
    actual_time = None
    discomfort_before = None
    discomfort_after = None
    load = None
    notes = None
