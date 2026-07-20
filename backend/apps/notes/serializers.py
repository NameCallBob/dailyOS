"""
notes domain serializers.

Field constraints mirror contract/api-design.md §2.2 exactly:
  notes.title        string, required, <=200
  notes.content       string, <=200000 (markdown)
  notes.folder        string <=200
  notes.tags          string[], each <=40 chars, <=30 items
  notes.pinned        boolean, required
  notes.is_daily      boolean, required
  notes.daily_date    date | undefined (only meaningful when is_daily=true)
  note_versions.note_id                 required, FK->notes
  note_versions.reason                  enum manual_save|auto_snapshot|restore|conflict_branch
  note_versions.note_version_at_snapshot number
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import Note, NoteVersion

MAX_TAGS = 30
MAX_TAG_LENGTH = 40


def validate_tags(tags):
    if not isinstance(tags, list):
        raise serializers.ValidationError("tags 必須是字串陣列。")
    if len(tags) > MAX_TAGS:
        raise serializers.ValidationError(f"tags 最多 {MAX_TAGS} 項。")
    for tag in tags:
        if not isinstance(tag, str):
            raise serializers.ValidationError("tags 每一項必須是字串。")
        if len(tag) > MAX_TAG_LENGTH:
            raise serializers.ValidationError(f"tags 每項長度不得超過 {MAX_TAG_LENGTH} 字元。")
    return tags


class NoteSerializer(BaseModelSerializer):
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    class Meta(BaseModelSerializer.Meta):
        model = Note
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "title",
            "content",
            "folder",
            "tags",
            "pinned",
            "is_daily",
            "daily_date",
            "project_id",
            "project_name",
            "task_id",
            "task_title",
        ]

    def validate_tags(self, value):
        return validate_tags(value)

    def validate(self, attrs):
        is_daily = attrs.get(
            "is_daily", getattr(self.instance, "is_daily", False) if self.instance else False
        )
        if not is_daily:
            attrs["daily_date"] = None
        return attrs


class NoteVersionSerializer(BaseModelSerializer):
    note_id = serializers.PrimaryKeyRelatedField(source="note", queryset=Note.objects.all())
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    class Meta(BaseModelSerializer.Meta):
        model = NoteVersion
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "note_id",
            "title",
            "content",
            "folder",
            "tags",
            "reason",
            "note_version_at_snapshot",
        ]

    def validate_tags(self, value):
        return validate_tags(value)

    def validate_note_id(self, note):
        request = self.context.get("request")
        if request is not None and note.user_id != request.user.id:
            raise serializers.ValidationError("找不到指定的筆記。")
        return note
