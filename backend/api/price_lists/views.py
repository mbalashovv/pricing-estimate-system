from django.utils import timezone
from rest_framework import filters, parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.price_lists.serializers import (
    PriceListDetailSerializer,
    PriceListItemSerializer,
    PriceListListSerializer,
    PriceListWriteSerializer,
)
from apps.catalog.models import CatalogItem
from apps.price_lists.models import PriceList, PriceListItem
from services.price_list.parser import PriceListParsingError, build_preview, validate_mapping
from tasks.price_lists import match_price_list_task, parse_price_list_task


class PriceListViewSet(viewsets.ModelViewSet):
    queryset = PriceList.objects.select_related("supplier").prefetch_related("items").all()
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "supplier__name")
    ordering_fields = ("uploaded_at", "created_at", "name")
    ordering = ("-uploaded_at",)

    def get_serializer_class(self):
        if self.action == "list":
            return PriceListListSerializer
        if self.action == "retrieve":
            return PriceListDetailSerializer
        return PriceListWriteSerializer

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        price_list = self.get_object()
        sheet_name = request.query_params.get("sheet")
        header_row = request.query_params.get("header_row", "1")

        try:
            preview_data = build_preview(
                file_path=price_list.source_file.path,
                sheet_name=sheet_name,
                header_row=int(header_row),
            )
        except (ValueError, PriceListParsingError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(preview_data)

    @action(detail=True, methods=["post"], url_path="mapping")
    def set_mapping(self, request, pk=None):
        price_list = self.get_object()

        try:
            preview_data = build_preview(
                file_path=price_list.source_file.path,
                sheet_name=request.data.get("sheet"),
                header_row=int(request.data.get("header_row", 1)),
            )
            mapping = validate_mapping(request.data, preview_data["columns"])
        except (ValueError, PriceListParsingError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        price_list.column_mapping = mapping
        price_list.save(update_fields=["column_mapping", "updated_at"])

        return Response({"column_mapping": mapping})

    @action(detail=True, methods=["post"], url_path="parse")
    def parse(self, request, pk=None):
        price_list = self.get_object()
        if not price_list.column_mapping:
            return Response(
                {"detail": "Column mapping must be set before parsing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        price_list.status = PriceList.Status.DRAFT
        price_list.progress = 0
        price_list.parser_errors = []
        price_list.parse_task_id = ""
        price_list.matching_status = PriceList.MatchingStatus.PENDING
        price_list.matching_progress = 0
        price_list.matching_task_id = ""
        price_list.save(
            update_fields=[
                "status",
                "progress",
                "parser_errors",
                "parse_task_id",
                "matching_status",
                "matching_progress",
                "matching_task_id",
                "updated_at",
            ]
        )

        task = parse_price_list_task.delay(price_list.id)
        price_list.parse_task_id = task.id
        price_list.status = PriceList.Status.PROCESSING
        price_list.progress = 10
        price_list.save(update_fields=["parse_task_id", "status", "progress", "updated_at"])

        return Response(
            {
                "message": "Price list parsing started.",
                "task_id": task.id,
                "price_list_id": price_list.id,
                "status": price_list.status,
                "progress": price_list.progress,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="match")
    def match(self, request, pk=None):
        price_list = self.get_object()
        if not price_list.items.exists():
            return Response(
                {"detail": "Price list must contain parsed items before matching."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        price_list.matching_status = PriceList.MatchingStatus.PENDING
        price_list.matching_progress = 0
        price_list.matching_task_id = ""
        price_list.save(
            update_fields=[
                "matching_status",
                "matching_progress",
                "matching_task_id",
                "updated_at",
            ]
        )

        task = match_price_list_task.delay(price_list.id)
        price_list.matching_task_id = task.id
        price_list.matching_status = PriceList.MatchingStatus.PROCESSING
        price_list.matching_progress = 10
        price_list.save(
            update_fields=[
                "matching_task_id",
                "matching_status",
                "matching_progress",
                "updated_at",
            ]
        )

        return Response(
            {
                "message": "Price list matching started.",
                "task_id": task.id,
                "price_list_id": price_list.id,
                "matching_status": price_list.matching_status,
                "matching_progress": price_list.matching_progress,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class PriceListItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PriceListItem.objects.select_related("price_list", "catalog_item").all()
    serializer_class = PriceListItemSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("article", "name", "price_list__name", "price_list__supplier__name")
    ordering_fields = ("id", "name", "price")
    ordering = ("id",)

    @action(detail=True, methods=["post"], url_path="set-match")
    def set_match(self, request, pk=None):
        price_list_item = self.get_object()
        catalog_item_id = request.data.get("catalog_item")
        if not catalog_item_id:
            return Response(
                {"detail": "'catalog_item' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        catalog_item = CatalogItem.objects.filter(pk=catalog_item_id).first()
        if not catalog_item:
            return Response(
                {"detail": "Catalog item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        price_list_item.catalog_item = catalog_item
        price_list_item.match_status = PriceListItem.MatchStatus.MANUAL
        price_list_item.match_method = PriceListItem.MatchMethod.MANUAL
        price_list_item.match_confidence = 1.0
        price_list_item.matched_at = timezone.now()
        price_list_item.save(
            update_fields=[
                "catalog_item",
                "match_status",
                "match_method",
                "match_confidence",
                "matched_at",
                "updated_at",
            ]
        )
        return Response(PriceListItemSerializer(price_list_item).data)

    @action(detail=True, methods=["post"], url_path="mark-no-match")
    def mark_no_match(self, request, pk=None):
        price_list_item = self.get_object()
        price_list_item.catalog_item = None
        price_list_item.match_status = PriceListItem.MatchStatus.NOT_MATCHED
        price_list_item.match_method = PriceListItem.MatchMethod.MANUAL
        price_list_item.match_confidence = None
        price_list_item.matched_at = timezone.now()
        price_list_item.save(
            update_fields=[
                "catalog_item",
                "match_status",
                "match_method",
                "match_confidence",
                "matched_at",
                "updated_at",
            ]
        )
        return Response(PriceListItemSerializer(price_list_item).data)
