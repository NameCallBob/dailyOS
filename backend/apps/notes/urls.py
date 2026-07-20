"""
notes domain urls -- mounted at /api/v1/ by config/urls.py.
"""

from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"notes", views.NoteViewSet, basename="notes")
router.register(r"note_versions", views.NoteVersionViewSet, basename="note_versions")

urlpatterns = router.urls
