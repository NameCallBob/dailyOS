"""
Base serializer for the BaseRecord contract fields.

Domain serializers should subclass BaseModelSerializer and only need to
declare `model`/`fields` in Meta (id, created_at, updated_at, version,
deleted are wired up here as read-only).
"""

from rest_framework import serializers


class BaseModelSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        read_only_fields = ("id", "created_at", "updated_at", "version", "deleted")

    def get_fields(self):
        fields = super().get_fields()
        for name in ("created_at", "updated_at", "version", "deleted"):
            if name in fields:
                fields[name].read_only = True
        return fields
