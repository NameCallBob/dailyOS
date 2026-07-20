"""
profile domain viewsets.

`user_profile` / `user_preferences` / `notification_prefs` /
`dashboard_layout` are singleton-per-user resources (contract §2.4):
"每位使用者僅一筆現行設定"; the front-end's `useSingleton()` hook calls
`list()` and, if empty, `create()`. `SingletonCreateMixin.create()` makes a
second `create()` for the same user idempotent -- it returns the existing
record (200) instead of erroring, since the front-end does not yet handle
409 (see the contract note under `user_profile`). The model's partial
unique constraint (`user`, non-deleted) is the DB-level backstop.
"""

from rest_framework import status
from rest_framework.response import Response

from apps.core.viewsets import OwnedModelViewSet
from apps.profile.models import DashboardLayout, NotificationPrefs, UserPreferences, UserProfile
from apps.profile.serializers import (
    DashboardLayoutSerializer,
    NotificationPrefsSerializer,
    UserPreferencesSerializer,
    UserProfileSerializer,
)


class SingletonCreateMixin:
    def create(self, request, *args, **kwargs):
        existing = self.get_queryset().first()
        if existing is not None:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)


class UserProfileViewSet(SingletonCreateMixin, OwnedModelViewSet):
    queryset = UserProfile.all_objects.all()
    serializer_class = UserProfileSerializer
    filterset_fields = ["sex", "activity_level", "fitness_goal", "health_data_visibility"]
    ordering_fields = ["created_at", "updated_at"]


class UserPreferencesViewSet(SingletonCreateMixin, OwnedModelViewSet):
    queryset = UserPreferences.all_objects.all()
    serializer_class = UserPreferencesSerializer
    filterset_fields = ["onboarding_completed", "onboarding_skipped"]
    ordering_fields = ["created_at", "updated_at"]


class NotificationPrefsViewSet(SingletonCreateMixin, OwnedModelViewSet):
    queryset = NotificationPrefs.all_objects.all()
    serializer_class = NotificationPrefsSerializer
    filterset_fields = ["quiet_hours_enabled", "timezone"]
    ordering_fields = ["created_at", "updated_at"]


class DashboardLayoutViewSet(SingletonCreateMixin, OwnedModelViewSet):
    queryset = DashboardLayout.all_objects.all()
    serializer_class = DashboardLayoutSerializer
    ordering_fields = ["created_at", "updated_at"]
