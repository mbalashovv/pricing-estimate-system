from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.catalog.models import CatalogItem
from apps.estimates.models import Estimate, EstimateItem
from apps.matching.models import EstimateItemMatch
from services.matching.embeddings import (
    EmbeddingConfigurationError,
    EmbeddingService,
    build_estimate_item_embedding_text,
    normalize_match_text,
)


@dataclass
class MatchResult:
    catalog_item: CatalogItem | None
    status: str
    method: str
    confidence: float | None
    note: str = ""


class SimpleMatcher:
    def __init__(self, embedding_service: EmbeddingService | None = None):
        self.embedding_service = embedding_service or EmbeddingService()

    def match(self, estimate_item: EstimateItem) -> MatchResult:
        exact_catalog_item = self._match_by_normalized_name(estimate_item.name)
        if exact_catalog_item:
            return MatchResult(
                catalog_item=exact_catalog_item,
                status=EstimateItemMatch.Status.MATCHED,
                method=EstimateItemMatch.Method.AI,
                confidence=1.0,
                note="Exact normalized name match.",
            )

        return self._match_by_embedding(estimate_item)

    def _match_by_normalized_name(self, item_name: str) -> CatalogItem | None:
        normalized_name = normalize_match_text(item_name)
        if not normalized_name:
            return None
        return CatalogItem.objects.filter(normalized_name=normalized_name).first()

    def _match_by_embedding(self, estimate_item: EstimateItem) -> MatchResult:
        query_text = build_estimate_item_embedding_text(estimate_item)
        if not query_text:
            return MatchResult(
                catalog_item=None,
                status=EstimateItemMatch.Status.NO_MATCH,
                method="",
                confidence=None,
                note="Estimate item has no data for embedding matching.",
            )

        try:
            query_embedding = self.embedding_service.embed(query_text)
        except (EmbeddingConfigurationError, ValueError) as exc:
            return MatchResult(
                catalog_item=None,
                status=EstimateItemMatch.Status.NO_MATCH,
                method="",
                confidence=None,
                note=str(exc),
            )

        candidates = list(
            CatalogItem.objects.exclude(embedding=None)
            .annotate(distance=CosineDistance("embedding", query_embedding))
            .order_by("distance")[: settings.MATCH_TOP_K]
        )
        if not candidates:
            return MatchResult(
                catalog_item=None,
                status=EstimateItemMatch.Status.NO_MATCH,
                method="",
                confidence=None,
                note="No catalog embeddings available for matching.",
            )

        best_item = candidates[0]
        confidence = max(0.0, min(1.0, 1.0 - float(best_item.distance)))
        if confidence >= settings.MATCH_STRONG_THRESHOLD:
            return MatchResult(
                catalog_item=best_item,
                status=EstimateItemMatch.Status.MATCHED,
                method=EstimateItemMatch.Method.AI,
                confidence=confidence,
                note="AI vector match.",
            )
        if confidence >= settings.MATCH_REVIEW_THRESHOLD:
            return MatchResult(
                catalog_item=best_item,
                status=EstimateItemMatch.Status.NEEDS_REVIEW,
                method=EstimateItemMatch.Method.AI,
                confidence=confidence,
                note="AI vector candidate found, manual review recommended.",
            )

        return MatchResult(
            catalog_item=None,
            status=EstimateItemMatch.Status.NO_MATCH,
            method="",
            confidence=confidence,
            note="Embedding match confidence is below threshold.",
        )


def get_matcher():
    return SimpleMatcher()


def upsert_match(estimate_item: EstimateItem, result: MatchResult) -> EstimateItemMatch:
    match, _ = EstimateItemMatch.objects.update_or_create(
        estimate_item=estimate_item,
        defaults={
            "catalog_item": result.catalog_item,
            "status": result.status,
            "method": result.method,
            "confidence": result.confidence,
            "note": result.note,
            "matched_at": timezone.now(),
        },
    )
    return match


def run_estimate_matching(estimate: Estimate, task_id: str | None = None) -> int:
    matcher = get_matcher()
    items = list(estimate.items.all())
    total = len(items)

    estimate.matching_status = Estimate.MatchingStatus.PROCESSING
    estimate.matching_progress = 5
    if task_id:
        estimate.matching_task_id = task_id
    estimate.save(update_fields=["matching_status", "matching_progress", "matching_task_id", "updated_at"])

    processed = 0
    with transaction.atomic():
        for item in items:
            result = matcher.match(item)
            upsert_match(item, result)
            processed += 1
            estimate.matching_progress = min(99, int(processed / total * 100)) if total else 100
            estimate.save(update_fields=["matching_progress", "updated_at"])

    estimate.matching_status = Estimate.MatchingStatus.COMPLETED
    estimate.matching_progress = 100
    estimate.save(update_fields=["matching_status", "matching_progress", "updated_at"])
    return processed
