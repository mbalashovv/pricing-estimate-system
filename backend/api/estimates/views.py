from django.utils import timezone
from rest_framework import filters, mixins, parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.estimates.serializers import (
    EstimateDetailSerializer,
    EstimateItemSerializer,
    EstimateItemMatchSerializer,
    EstimateListSerializer,
    EstimateWriteSerializer,
)
from apps.catalog.models import CatalogItem
from apps.estimates.models import Estimate, EstimateItem
from apps.matching.models import EstimateItemMatch
from services.estimate.parser import EstimateParsingError, build_preview, validate_mapping
from tasks.estimates import parse_estimate_task
from tasks.matching import match_estimate_task


class EstimateViewSet(viewsets.ModelViewSet):
    queryset = Estimate.objects.select_related("project").prefetch_related("items").all()
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "project__name")
    ordering_fields = ("uploaded_at", "created_at", "name")
    ordering = ("-uploaded_at",)

    def get_serializer_class(self):
        if self.action == "list":
            return EstimateListSerializer
        if self.action == "retrieve":
            return EstimateDetailSerializer
        return EstimateWriteSerializer

    @action(detail=True, methods=["get"], url_path="preview")
    def preview(self, request, pk=None):
        estimate = self.get_object()
        sheet_name = request.query_params.get("sheet")
        header_row = request.query_params.get("header_row", "1")

        try:
            preview_data = build_preview(
                file_path=estimate.source_file.path,
                sheet_name=sheet_name,
                header_row=int(header_row),
            )
        except (ValueError, EstimateParsingError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(preview_data)

    @action(detail=True, methods=["post"], url_path="mapping")
    def set_mapping(self, request, pk=None):
        estimate = self.get_object()

        try:
            preview_data = build_preview(
                file_path=estimate.source_file.path,
                sheet_name=request.data.get("sheet"),
                header_row=int(request.data.get("header_row", 1)),
            )
            mapping = validate_mapping(request.data, preview_data["columns"])
        except (ValueError, EstimateParsingError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        estimate.column_mapping = mapping
        estimate.save(update_fields=["column_mapping", "updated_at"])

        return Response({"column_mapping": mapping})

    @action(detail=True, methods=["post"], url_path="parse")
    def parse(self, request, pk=None):
        estimate = self.get_object()
        if not estimate.column_mapping:
            return Response(
                {"detail": "Column mapping must be set before parsing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estimate.status = Estimate.Status.DRAFT
        estimate.progress = 0
        estimate.parser_errors = []
        estimate.parse_task_id = ""
        estimate.save(
            update_fields=["status", "progress", "parser_errors", "parse_task_id", "updated_at"]
        )

        task = parse_estimate_task.delay(estimate.id)
        estimate.parse_task_id = task.id
        estimate.status = Estimate.Status.PROCESSING
        estimate.progress = 10
        estimate.save(update_fields=["parse_task_id", "status", "progress", "updated_at"])

        return Response(
            {
                "message": "Estimate parsing started.",
                "task_id": task.id,
                "estimate_id": estimate.id,
                "status": estimate.status,
                "progress": estimate.progress,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="match")
    def match(self, request, pk=None):
        estimate = self.get_object()
        if not estimate.items.exists():
            return Response(
                {"detail": "Estimate must contain parsed items before matching."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        estimate.matching_status = Estimate.MatchingStatus.PENDING
        estimate.matching_progress = 0
        estimate.matching_task_id = ""
        estimate.save(update_fields=["matching_status", "matching_progress", "matching_task_id", "updated_at"])

        task = match_estimate_task.delay(estimate.id)
        estimate.matching_task_id = task.id
        estimate.matching_status = Estimate.MatchingStatus.PROCESSING
        estimate.matching_progress = 10
        estimate.save(update_fields=["matching_task_id", "matching_status", "matching_progress", "updated_at"])

        return Response(
            {
                "message": "Estimate matching started.",
                "task_id": task.id,
                "estimate_id": estimate.id,
                "matching_status": estimate.matching_status,
                "matching_progress": estimate.matching_progress,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class EstimateItemViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = EstimateItem.objects.select_related("estimate").prefetch_related("match__catalog_item").all()
    serializer_class = EstimateItemSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("article", "name", "estimate__name", "estimate__project__name")
    ordering_fields = ("id", "name", "quantity")
    ordering = ("id",)

    @action(detail=True, methods=["post"], url_path="set-match")
    def set_match(self, request, pk=None):
        estimate_item = self.get_object()
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

        match, _ = EstimateItemMatch.objects.update_or_create(
            estimate_item=estimate_item,
            defaults={
                "catalog_item": catalog_item,
                "status": EstimateItemMatch.Status.MATCHED,
                "method": EstimateItemMatch.Method.MANUAL,
                "confidence": 1.0,
                "note": request.data.get("note", "Manual match."),
                "matched_at": timezone.now(),
            },
        )
        return Response(EstimateItemMatchSerializer(match).data)

    @action(detail=True, methods=["post"], url_path="mark-no-match")
    def mark_no_match(self, request, pk=None):
        estimate_item = self.get_object()
        match, _ = EstimateItemMatch.objects.update_or_create(
            estimate_item=estimate_item,
            defaults={
                "catalog_item": None,
                "status": EstimateItemMatch.Status.NO_MATCH,
                "method": EstimateItemMatch.Method.MANUAL,
                "confidence": None,
                "note": request.data.get("note", "Marked as no match manually."),
                "matched_at": timezone.now(),
            },
        )
        return Response(EstimateItemMatchSerializer(match).data)
