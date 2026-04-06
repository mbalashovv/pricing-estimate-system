from django.db import models

from core.models import TimeStampedModel


class Estimate(TimeStampedModel):
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

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="estimates",
    )
    name = models.CharField(max_length=255)
    source_file = models.FileField(upload_to="estimates/")
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
        return f"{self.project.name} - {self.name}"


class EstimateItem(TimeStampedModel):
    estimate = models.ForeignKey(
        Estimate,
        on_delete=models.CASCADE,
        related_name="items",
    )
    article = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=500)
    unit = models.CharField(max_length=50, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    material_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    labor_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
    raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["article"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self) -> str:
        return self.name
