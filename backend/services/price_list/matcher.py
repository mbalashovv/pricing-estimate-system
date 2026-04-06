from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from pgvector.django import CosineDistance

from apps.catalog.models import CatalogItem
from apps.price_lists.models import PriceList, PriceListItem
from services.matching.embeddings import (
    EmbeddingConfigurationError,
    EmbeddingService,
    build_estimate_item_embedding_text,
    normalize_match_text,
)


@dataclass
class PriceListMatchResult:
    catalog_item: CatalogItem | None
    status: str
    method: str
    confidence: float | None


class PriceListMatcher:
    def __init__(self, embedding_service: EmbeddingService | None = None):
        self.embedding_service = embedding_service or EmbeddingService()

    def match(self, price_list_item: PriceListItem) -> PriceListMatchResult:
        exact_catalog_item = self._match_by_normalized_name(price_list_item.name)
        if exact_catalog_item:
            return PriceListMatchResult(
                catalog_item=exact_catalog_item,
                status=PriceListItem.MatchStatus.MATCHED,
                method=PriceListItem.MatchMethod.AI,
                confidence=1.0,
            )

        query_text = build_estimate_item_embedding_text(price_list_item)
        if not query_text:
            return PriceListMatchResult(
                catalog_item=None,
                status=PriceListItem.MatchStatus.NOT_MATCHED,
                method="",
                confidence=None,
            )

        try:
            query_embedding = self.embedding_service.embed(query_text)
        except (EmbeddingConfigurationError, ValueError):
            return PriceListMatchResult(
                catalog_item=None,
                status=PriceListItem.MatchStatus.NOT_MATCHED,
                method="",
                confidence=None,
            )

        candidates = list(
            CatalogItem.objects.exclude(embedding=None)
            .annotate(distance=CosineDistance("embedding", query_embedding))
            .order_by("distance")[: settings.MATCH_TOP_K]
        )
        if not candidates:
            return PriceListMatchResult(
                catalog_item=None,
                status=PriceListItem.MatchStatus.NOT_MATCHED,
                method="",
                confidence=None,
            )

        best_item = candidates[0]
        confidence = max(0.0, min(1.0, 1.0 - float(best_item.distance)))
        if confidence >= settings.MATCH_STRONG_THRESHOLD:
            return PriceListMatchResult(
                catalog_item=best_item,
                status=PriceListItem.MatchStatus.MATCHED,
                method=PriceListItem.MatchMethod.AI,
                confidence=confidence,
            )
        if confidence >= settings.MATCH_REVIEW_THRESHOLD:
            return PriceListMatchResult(
                catalog_item=best_item,
                status=PriceListItem.MatchStatus.NEEDS_REVIEW,
                method=PriceListItem.MatchMethod.AI,
                confidence=confidence,
            )

        return PriceListMatchResult(
            catalog_item=None,
            status=PriceListItem.MatchStatus.NOT_MATCHED,
            method="",
            confidence=confidence,
        )

    def _match_by_normalized_name(self, item_name: str) -> CatalogItem | None:
        normalized_name = normalize_match_text(item_name)
        if not normalized_name:
            return None
        return CatalogItem.objects.filter(normalized_name=normalized_name).first()


def upsert_price_list_item_match(
    price_list_item: PriceListItem,
    result: PriceListMatchResult,
) -> PriceListItem:
    price_list_item.catalog_item = result.catalog_item
    price_list_item.match_status = result.status
    price_list_item.match_method = result.method
    price_list_item.match_confidence = result.confidence
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
    return price_list_item


def run_price_list_matching(price_list: PriceList, task_id: str | None = None) -> int:
    matcher = PriceListMatcher()
    items = list(price_list.items.all())
    total = len(items)

    price_list.matching_status = PriceList.MatchingStatus.PROCESSING
    price_list.matching_progress = 5
    if task_id:
        price_list.matching_task_id = task_id
    price_list.save(
        update_fields=[
            "matching_status",
            "matching_progress",
            "matching_task_id",
            "updated_at",
        ]
    )

    processed = 0
    with transaction.atomic():
        for item in items:
            result = matcher.match(item)
            upsert_price_list_item_match(item, result)
            processed += 1
            price_list.matching_progress = min(99, int(processed / total * 100)) if total else 100
            price_list.save(update_fields=["matching_progress", "updated_at"])

    price_list.matching_status = PriceList.MatchingStatus.COMPLETED
    price_list.matching_progress = 100
    price_list.save(update_fields=["matching_status", "matching_progress", "updated_at"])
    return processed
