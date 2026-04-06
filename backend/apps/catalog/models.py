from django.db import models
from django.db import transaction
from pgvector.django import HnswIndex, VectorField

from core.models import TimeStampedModel
from services.matching.embeddings import normalize_match_text


class CatalogGroup(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        previous_name = None
        if self.pk:
            previous_name = (
                type(self).objects.filter(pk=self.pk).values_list("name", flat=True).first()
            )

        super().save(*args, **kwargs)

        if previous_name is not None and previous_name != self.name:
            from services.matching.embeddings import refresh_catalog_group_embeddings

            transaction.on_commit(lambda: refresh_catalog_group_embeddings(self))

    def __str__(self) -> str:
        return self.name


class CatalogItem(TimeStampedModel):
    article = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=500)
    normalized_name = models.CharField(max_length=500, blank=True, db_index=True, editable=False)
    unit = models.CharField(max_length=50, blank=True)
    embedding = VectorField(dimensions=1536, null=True, blank=True)
    group = models.ForeignKey(
        CatalogGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["article"]),
            models.Index(fields=["name"]),
            HnswIndex(
                name="catalog_item_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def build_embedding_text(self) -> str:
        parts = [self.name, self.article, self.group.name if self.group else ""]
        return " ".join(part.strip() for part in parts if part and part.strip())

    def save(self, *args, **kwargs):
        self.normalized_name = normalize_match_text(self.name)
        previous_values = None
        if self.pk:
            previous_values = (
                type(self)
                .objects.filter(pk=self.pk)
                .values("name", "article", "group_id")
                .first()
            )

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"normalized_name"}

        super().save(*args, **kwargs)

        should_refresh_embedding = previous_values is None or any(
            (
                previous_values["name"] != self.name,
                previous_values["article"] != self.article,
                previous_values["group_id"] != self.group_id,
            )
        )
        if should_refresh_embedding:
            from services.matching.embeddings import refresh_catalog_item_embedding

            transaction.on_commit(lambda: refresh_catalog_item_embedding(self))

    def __str__(self) -> str:
        if self.article:
            return f"{self.article} - {self.name}"
        return self.name
