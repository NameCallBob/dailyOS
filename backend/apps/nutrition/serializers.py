"""
nutrition domain serializers.
"""

from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer

from .models import MealLog


class CustomNutrientSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    value = serializers.FloatField()
    unit = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class MealLogSerializer(BaseModelSerializer):
    food_tags = serializers.ListField(child=serializers.CharField(), default=list)
    custom_nutrients = CustomNutrientSerializer(many=True, required=False, default=list)

    class Meta(BaseModelSerializer.Meta):
        model = MealLog
        fields = [
            "id",
            "created_at",
            "updated_at",
            "version",
            "deleted",
            "date",
            "logged_at",
            "type",
            "photo",
            "text",
            "food_tags",
            "portion",
            "calories",
            "protein",
            "carb",
            "fat",
            "calcium",
            "fiber",
            "water",
            "custom_nutrients",
            "notes",
        ]
