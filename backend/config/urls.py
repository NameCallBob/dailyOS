"""
DailyOS backend URL configuration.

All API endpoints live under /api/v1/. See contract/api-design.md for the
full endpoint list. Each domain app under apps/<name>/urls.py exposes a
DRF DefaultRouter mounted at /api/v1/ (the router itself supplies the
resource path prefix, e.g. /api/v1/tasks/).
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from apps.core.views import health_check

DOMAIN_APP_NAMES = [
    "tasks",
    "calendar",
    "focus",
    "notes",
    "habits",
    "body",
    "nutrition",
    "sleep",
    "symptoms",
    "meds",
    "workouts",
    "rehab",
    "health_records",
    "profile",
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

urlpatterns += [path("api/v1/", include(f"apps.{app_name}.urls")) for app_name in DOMAIN_APP_NAMES]
