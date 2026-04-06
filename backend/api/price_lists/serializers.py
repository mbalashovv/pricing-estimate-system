from rest_framework import serializers

from apps.price_lists.models import PriceList, PriceListItem


class PriceListItemSerializer(serializers.ModelSerializer):
    catalog_item_name = serializers.CharField(source="catalog_item.name", read_only=True)
    catalog_item_article = serializers.CharField(source="catalog_item.article", read_only=True)

    class Meta:
        model = PriceListItem
        fields = (
            "id",
            "price_list",
            "catalog_item",
            "catalog_item_name",
            "catalog_item_article",
            "article",
            "name",
            "unit",
            "price",
            "match_status",
            "match_method",
            "match_confidence",
            "matched_at",
            "raw_data",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "catalog_item_name",
            "catalog_item_article",
            "created_at",
            "updated_at",
        )


class PriceListListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    items_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = PriceList
        fields = (
            "id",
            "supplier",
            "supplier_name",
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
            "supplier_name",
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


class PriceListDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    items = PriceListItemSerializer(many=True, read_only=True)

    class Meta:
        model = PriceList
        fields = (
            "id",
            "supplier",
            "supplier_name",
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
            "supplier_name",
            "uploaded_at",
            "items",
            "parse_task_id",
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "created_at",
            "updated_at",
        )


class PriceListWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceList
        fields = (
            "id",
            "supplier",
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
