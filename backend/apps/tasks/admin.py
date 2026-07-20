from django.contrib import admin

from apps.tasks.models import Project, Tag, Task

admin.site.register(Task)
admin.site.register(Project)
admin.site.register(Tag)
