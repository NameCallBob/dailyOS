"""
tasks domain serializers.

Field validation notes (see contract/api-design.md §2.1):
  - `project_id` / `parent_id`: PrimaryKeyRelatedField scoped to the
    requesting user's own rows (IDOR guard) -- referencing another user's
    project/task resolves to a normal validation error, never a leak.
  - `depends_on` / `parent_id`: cycle-checked against the user's existing
    task graph in `TaskSerializer.validate()`.
  - `Project.progress`: read-only, derived from owned tasks
    (`Project.compute_progress()`), never accepted on write.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.tasks.models import Project, Tag, Task


class MilestoneSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    due_date = serializers.DateField(required=False, allow_null=True)
    done = serializers.BooleanField()


class ProjectSerializer(BaseModelSerializer):
    progress = serializers.SerializerMethodField()
    milestones = MilestoneSerializer(many=True, required=False)

    class Meta(BaseModelSerializer.Meta):
        model = Project
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "name",
            "description",
            "status",
            "color",
            "start_date",
            "target_date",
            "progress",
            "milestones",
        ]

    def get_progress(self, obj):
        return obj.compute_progress()


class TagSerializer(BaseModelSerializer):
    class Meta(BaseModelSerializer.Meta):
        model = Tag
        fields = ["id", "created_at", "updated_at", "version", "deleted", "name", "color"]


class TaskSerializer(BaseModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(
        source="project",
        queryset=Project.all_objects.none(),
        required=False,
        allow_null=True,
    )
    parent_id = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=Task.all_objects.none(),
        required=False,
        allow_null=True,
    )
    tags = serializers.ListField(child=serializers.CharField(max_length=40), required=False)
    depends_on = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta(BaseModelSerializer.Meta):
        model = Task
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "title",
            "description",
            "status",
            "priority",
            "project_id",
            "tags",
            "due_date",
            "scheduled_at",
            "estimate_min",
            "actual_min",
            "energy",
            "context",
            "recurrence_rule",
            "parent_id",
            "depends_on",
            "remind_at",
            "completed_at",
            "archived",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            self.fields["project_id"].queryset = Project.all_objects.filter(user=user)
            self.fields["parent_id"].queryset = Task.all_objects.filter(user=user)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        instance = self.instance

        self_id = str(instance.id) if instance is not None else attrs.get("id")
        self_id = str(self_id) if self_id else None

        parent = attrs.get("parent", instance.parent if instance is not None else None)
        if parent is not None:
            if self_id is not None and str(parent.id) == self_id:
                raise serializers.ValidationError({"parent_id": ["任務不能是自己的父任務。"]})
            ancestor = parent
            visited = set()
            while ancestor is not None:
                if self_id is not None and str(ancestor.id) == self_id:
                    raise serializers.ValidationError({"parent_id": ["父任務關聯造成循環。"]})
                if ancestor.id in visited:
                    break
                visited.add(ancestor.id)
                ancestor = ancestor.parent

        depends_on = attrs.get("depends_on")
        if depends_on is not None and user is not None:
            dep_ids = [str(d) for d in depends_on]
            if self_id is not None and self_id in dep_ids:
                raise serializers.ValidationError({"depends_on": ["任務不能相依於自己。"]})

            graph = {
                str(task_id): [str(dep) for dep in (deps or [])]
                for task_id, deps in Task.all_objects.filter(user=user).values_list(
                    "id", "depends_on"
                )
            }
            if self_id is not None:
                graph[self_id] = dep_ids

            def has_cycle(node, path):
                if node in path:
                    return True
                next_path = path | {node}
                for nxt in graph.get(node, []):
                    if has_cycle(nxt, next_path):
                        return True
                return False

            if self_id is not None and has_cycle(self_id, set()):
                raise serializers.ValidationError({"depends_on": ["任務相依關聯造成循環。"]})

        return attrs
