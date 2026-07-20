"""
tasks domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from apps.tasks import views

router = DefaultRouter()
router.register(r"tasks", views.TaskViewSet, basename="tasks")
router.register(r"projects", views.ProjectViewSet, basename="projects")
router.register(r"tags", views.TagViewSet, basename="tags")

urlpatterns = router.urls
