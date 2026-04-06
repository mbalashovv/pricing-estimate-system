from rest_framework import serializers

from apps.estimates.models import Estimate, EstimateItem
from apps.matching.models import EstimateItemMatch


class EstimateItemMatchSerializer(serializers.ModelSerializer):
    catalog_item_name = serializers.CharField(source="catalog_item.name", read_only=True)
    catalog_item_article = serializers.CharField(source="catalog_item.article", read_only=True)

    class Meta:
        model = EstimateItemMatch
        fields = (
            "id",
            "catalog_item",
            "catalog_item_name",
            "catalog_item_article",
            "status",
            "method",
            "confidence",
            "note",
            "matched_at",
        )
        read_only_fields = fields


class EstimateItemSerializer(serializers.ModelSerializer):
    match = EstimateItemMatchSerializer(read_only=True)

    class Meta:
        model = EstimateItem
        fields = (
            "id",
            "estimate",
            "article",
            "name",
            "unit",
            "quantity",
            "material_price",
            "labor_price",
            "match",
            "raw_data",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
        )


class EstimateListSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Estimate
        fields = (
            "id",
            "project",
            "project_name",
            "name",
            "source_file",
            "column_mapping",
            "progress",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "status",
            "uploaded_at",
            "items_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "project_name",
            "uploaded_at",
            "items_count",
            "column_mapping",
            "progress",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "created_at",
            "updated_at",
        )


class EstimateDetailSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    items = EstimateItemSerializer(many=True, read_only=True)

    class Meta:
        model = Estimate
        fields = (
            "id",
            "project",
            "project_name",
            "name",
            "source_file",
            "column_mapping",
            "progress",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "status",
            "uploaded_at",
            "parser_errors",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "project_name",
            "uploaded_at",
            "items",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "created_at",
            "updated_at",
        )


class EstimateWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estimate
        fields = (
            "id",
            "project",
            "name",
            "source_file",
            "column_mapping",
            "progress",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "status",
            "uploaded_at",
            "parser_errors",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uploaded_at",
            "column_mapping",
            "progress",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "parser_errors",
            "created_at",
            "updated_at",
        )
