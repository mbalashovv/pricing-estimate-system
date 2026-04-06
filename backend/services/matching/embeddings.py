from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import TYPE_CHECKING

from django.conf import settings
from django.utils import timezone

if TYPE_CHECKING:
    from apps.catalog.models import CatalogItem
    from apps.catalog.models import CatalogGroup
    from apps.estimates.models import EstimateItem


logger = logging.getLogger(__name__)


def normalize_text(value: str) -> str:
    return " ".join((value or "").strip().split())


def normalize_match_text(value: str) -> str:
    return normalize_text(value).lower()


class EmbeddingConfigurationError(Exception):
    pass


@dataclass
class EmbeddingService:
    model: str = settings.EMBEDDING_MODEL
    dimensions: int = settings.EMBEDDING_DIMENSIONS
    api_key: str = settings.EMBEDDING_API_KEY

    def embed(self, text: str) -> list[float]:
        normalized = normalize_text(text)
        if not normalized:
            raise ValueError("Embedding text cannot be empty.")
        if not self.api_key:
            raise EmbeddingConfigurationError("EMBEDDING_API_KEY is not configured.")

        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)
        response = client.embeddings.create(
            model=self.model,
            input=normalized,
            dimensions=self.dimensions,
        )
        embedding = response.data[0].embedding
        if len(embedding) != self.dimensions:
            raise ValueError(
                f"Embedding dimension mismatch: expected {self.dimensions}, got {len(embedding)}."
            )
        return embedding


def build_catalog_item_embedding_text(catalog_item: CatalogItem) -> str:
    return normalize_text(catalog_item.build_embedding_text())


def build_estimate_item_embedding_text(estimate_item: EstimateItem) -> str:
    parts = [estimate_item.name, estimate_item.article]
    return normalize_text(" ".join(part.strip() for part in parts if part and part.strip()))


def update_catalog_item_embedding(
    catalog_item: CatalogItem,
    service: EmbeddingService | None = None,
    save: bool = True,
) -> list[float]:
    service = service or EmbeddingService()
    embedding = service.embed(build_catalog_item_embedding_text(catalog_item))
    catalog_item.embedding = embedding
    if save:
        type(catalog_item).objects.filter(pk=catalog_item.pk).update(
            embedding=embedding,
            updated_at=timezone.now(),
        )
    return embedding


def refresh_catalog_item_embedding(catalog_item: CatalogItem) -> None:
    try:
        update_catalog_item_embedding(catalog_item)
    except Exception:
        logger.exception("Failed to refresh embedding for catalog item %s", catalog_item.pk)


def refresh_catalog_group_embeddings(catalog_group: CatalogGroup) -> None:
    for catalog_item in catalog_group.items.all():
        refresh_catalog_item_embedding(catalog_item)
