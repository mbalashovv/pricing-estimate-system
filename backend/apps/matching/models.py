from django.db import models

from core.models import TimeStampedModel


class EstimateItemMatch(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        MATCHED = "matched", "Matched"
        NEEDS_REVIEW = "needs_review", "Needs review"
        NO_MATCH = "no_match", "No match"

    class Method(models.TextChoices):
        MANUAL = "manual", "Manual"
        AI = "ai", "AI"

    estimate_item = models.OneToOneField(
        "estimates.EstimateItem",
        on_delete=models.CASCADE,
        related_name="match",
    )
    catalog_item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="estimate_matches",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    method = models.CharField(
        max_length=20,
        choices=Method.choices,
        blank=True,
    )
    confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    note = models.CharField(max_length=255, blank=True)
    matched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"Match for estimate item #{self.estimate_item_id}"
