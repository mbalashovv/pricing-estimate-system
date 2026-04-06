from rest_framework import serializers

from apps.catalog.models import CatalogGroup, CatalogItem


class CatalogGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogGroup
        fields = (
            "id",
            "name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CatalogItemSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = CatalogItem
        fields = (
            "id",
            "article",
            "name",
            "unit",
            "group",
            "group_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "group_name", "created_at", "updated_at")
