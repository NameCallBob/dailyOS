import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.notes.models import NoteVersion
from apps.notes.tests.factories import NoteFactory, NoteVersionFactory, UserFactory


def auth_client(user=None):
    user = user or UserFactory()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestNotesCrud:
    def test_create_note(self):
        client, _user = auth_client()
        response = client.post(
            "/api/v1/notes/",
            {
                "title": "My note",
                "content": "body",
                "folder": "work/ideas",
                "tags": ["a", "b"],
                "pinned": False,
                "is_daily": False,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert response.data["title"] == "My note"
        assert response.data["version"] == 1
        assert response.data["deleted"] is False
        assert "id" in response.data and "created_at" in response.data

    def test_list_notes_paginated_envelope(self):
        client, user = auth_client()
        NoteFactory.create_batch(3, user=user)
        response = client.get("/api/v1/notes/")
        assert response.status_code == status.HTTP_200_OK
        assert set(response.data.keys()) == {"results", "count", "next", "previous"}
        assert response.data["count"] == 3

    def test_retrieve_note(self):
        client, user = auth_client()
        note = NoteFactory(user=user)
        response = client.get(f"/api/v1/notes/{note.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(note.id)

    def test_update_note_increments_version_and_snapshots_previous_state(self):
        client, user = auth_client()
        note = NoteFactory(user=user, title="Original", content="Original body", version=1)

        response = client.patch(f"/api/v1/notes/{note.id}/", {"title": "Updated"}, format="json")

        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["version"] == 2
        assert response.data["title"] == "Updated"

        # A snapshot of the pre-update content must be preserved (contract:
        # "筆記不得無聲覆蓋").
        snapshot = NoteVersion.objects.get(note=note)
        assert snapshot.title == "Original"
        assert snapshot.content == "Original body"
        assert snapshot.reason == "auto_snapshot"
        assert snapshot.note_version_at_snapshot == 1

    def test_soft_delete_sets_deleted_and_excluded_from_default_list(self):
        client, user = auth_client()
        note = NoteFactory(user=user)

        response = client.delete(f"/api/v1/notes/{note.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        note.refresh_from_db()
        assert note.deleted is True
        assert note.version == 2

        list_response = client.get("/api/v1/notes/")
        assert list_response.data["count"] == 0

        list_with_deleted = client.get("/api/v1/notes/?deleted=true")
        assert list_with_deleted.data["count"] == 1

    def test_tags_validation_rejects_too_many_tags(self):
        client, _user = auth_client()
        response = client.post(
            "/api/v1/notes/",
            {
                "title": "Too many tags",
                "tags": [f"t{i}" for i in range(31)],
                "pinned": False,
                "is_daily": False,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "tags" in response.data["field_errors"]

    def test_tags_validation_rejects_tag_too_long(self):
        client, _user = auth_client()
        response = client.post(
            "/api/v1/notes/",
            {
                "title": "Long tag",
                "tags": ["x" * 41],
                "pinned": False,
                "is_daily": False,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tags" in response.data["field_errors"]

    def test_title_required(self):
        client, _user = auth_client()
        response = client.post(
            "/api/v1/notes/", {"pinned": False, "is_daily": False}, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in response.data["field_errors"]

    def test_daily_date_cleared_when_not_daily(self):
        client, user = auth_client()
        note = NoteFactory(user=user, is_daily=True, daily_date="2026-07-20")
        response = client.patch(f"/api/v1/notes/{note.id}/", {"is_daily": False}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["daily_date"] is None


@pytest.mark.django_db
class TestNotesOwnerScoping:
    def test_cannot_retrieve_other_users_note(self):
        client, _user = auth_client()
        other_note = NoteFactory()
        response = client.get(f"/api/v1/notes/{other_note.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_update_other_users_note(self):
        client, _user = auth_client()
        other_note = NoteFactory()
        response = client.patch(
            f"/api/v1/notes/{other_note.id}/", {"title": "hacked"}, format="json"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        other_note.refresh_from_db()
        assert other_note.title != "hacked"

    def test_cannot_delete_other_users_note(self):
        client, _user = auth_client()
        other_note = NoteFactory()
        response = client.delete(f"/api/v1/notes/{other_note.id}/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_only_returns_own_notes(self):
        client, user = auth_client()
        NoteFactory.create_batch(2, user=user)
        NoteFactory.create_batch(5)  # other users' notes
        response = client.get("/api/v1/notes/")
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestNotesCustomActions:
    def test_toggle_favorite_flips_pinned_and_bumps_version(self):
        client, user = auth_client()
        note = NoteFactory(user=user, pinned=False)
        response = client.post(f"/api/v1/notes/{note.id}/toggle_favorite/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["pinned"] is True
        assert response.data["version"] == 2

        response = client.post(f"/api/v1/notes/{note.id}/toggle_favorite/")
        assert response.data["pinned"] is False
        assert response.data["version"] == 3

    def test_toggle_favorite_on_other_users_note_is_404(self):
        client, _user = auth_client()
        other_note = NoteFactory(pinned=False)
        response = client.post(f"/api/v1/notes/{other_note.id}/toggle_favorite/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_restore_undoes_soft_delete(self):
        client, user = auth_client()
        note = NoteFactory(user=user, deleted=True)
        response = client.post(f"/api/v1/notes/{note.id}/restore/")
        assert response.status_code == status.HTTP_200_OK, response.data
        assert response.data["deleted"] is False
        note.refresh_from_db()
        assert note.deleted is False

    def test_restore_on_other_users_note_is_404(self):
        client, _user = auth_client()
        other_note = NoteFactory(deleted=True)
        response = client.post(f"/api/v1/notes/{other_note.id}/restore/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNoteVersions:
    def test_create_note_version(self):
        client, user = auth_client()
        note = NoteFactory(user=user)
        response = client.post(
            "/api/v1/note_versions/",
            {
                "note_id": str(note.id),
                "title": note.title,
                "content": note.content,
                "folder": note.folder,
                "tags": [],
                "reason": "manual_save",
                "note_version_at_snapshot": note.version,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert str(response.data["note_id"]) == str(note.id)
        assert response.data["reason"] == "manual_save"

    def test_cannot_create_version_for_other_users_note(self):
        client, _user = auth_client()
        other_note = NoteFactory()
        response = client.post(
            "/api/v1/note_versions/",
            {
                "note_id": str(other_note.id),
                "title": "x",
                "content": "y",
                "reason": "manual_save",
                "note_version_at_snapshot": 1,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_note_versions_owner_scoped(self):
        client, user = auth_client()
        note = NoteFactory(user=user)
        NoteVersionFactory.create_batch(2, note=note, user=user)
        NoteVersionFactory()  # another user's version
        response = client.get("/api/v1/note_versions/")
        assert response.data["count"] == 2

    def test_filter_versions_by_note(self):
        client, user = auth_client()
        note_a = NoteFactory(user=user)
        note_b = NoteFactory(user=user)
        NoteVersionFactory(note=note_a, user=user)
        NoteVersionFactory.create_batch(2, note=note_b, user=user)
        response = client.get(f"/api/v1/note_versions/?note={note_a.id}")
        assert response.data["count"] == 1

    def test_invalid_reason_rejected(self):
        client, user = auth_client()
        note = NoteFactory(user=user)
        response = client.post(
            "/api/v1/note_versions/",
            {
                "note_id": str(note.id),
                "title": "x",
                "content": "y",
                "reason": "not_a_real_reason",
                "note_version_at_snapshot": 1,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "reason" in response.data["field_errors"]
