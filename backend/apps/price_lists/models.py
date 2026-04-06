from django.db import models

from core.models import TimeStampedModel


class PriceList(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class MatchingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.CASCADE,
        related_name="price_lists",
    )
    name = models.CharField(max_length=255)
    source_file = models.FileField(upload_to="price_lists/")
    column_mapping = models.JSONField(default=dict, blank=True)
    progress = models.PositiveSmallIntegerField(default=0)
    parse_task_id = models.CharField(max_length=255, blank=True)
    matching_status = models.CharField(
        max_length=20,
        choices=MatchingStatus.choices,
        default=MatchingStatus.PENDING,
    )
    matching_progress = models.PositiveSmallIntegerField(default=0)
    matching_task_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    parser_errors = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return f"{self.supplier.name} - {self.name}"


class PriceListItem(TimeStampedModel):
    class MatchStatus(models.TextChoices):
        MATCHED = "matched", "Matched"
        NEEDS_REVIEW = "needs_review", "Needs review"
        NOT_MATCHED = "not_matched", "Not matched"
        MANUAL = "manual", "Manual"

    class MatchMethod(models.TextChoices):
        AI = "ai", "AI"
        MANUAL = "manual", "Manual"

    price_list = models.ForeignKey(
        PriceList,
        on_delete=models.CASCADE,
        related_name="items",
    )
    catalog_item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supplier_items",
    )
    article = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=500)
    unit = models.CharField(max_length=50, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    match_status = models.CharField(
        max_length=20,
        choices=MatchStatus.choices,
        default=MatchStatus.NOT_MATCHED,
    )
    match_method = models.CharField(
        max_length=20,
        choices=MatchMethod.choices,
        blank=True,
    )
    match_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    matched_at = models.DateTimeField(null=True, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["article"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self) -> str:
        return self.name
