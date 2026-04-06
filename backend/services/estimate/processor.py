from django.db import transaction
from django.utils import timezone

from apps.estimates.models import Estimate, EstimateItem
from services.estimate.parser import EstimateParsingError, build_items_payload


def parse_estimate(estimate: Estimate, task_id: str | None = None) -> int:
    try:
        estimate.status = Estimate.Status.PROCESSING
        estimate.progress = 25
        if task_id:
            estimate.parse_task_id = task_id
        estimate.parser_errors = []
        estimate.updated_at = timezone.now()
        estimate.save(
            update_fields=["status", "progress", "parse_task_id", "parser_errors", "updated_at"]
        )

        items_payload = build_items_payload(
            file_path=estimate.source_file.path,
            mapping=estimate.column_mapping,
        )

        with transaction.atomic():
            estimate.items.all().delete()
            EstimateItem.objects.bulk_create(
                [EstimateItem(estimate=estimate, **item_payload) for item_payload in items_payload]
            )
            estimate.status = Estimate.Status.COMPLETED
            estimate.progress = 100
            estimate.parser_errors = []
            estimate.updated_at = timezone.now()
            estimate.save(update_fields=["status", "progress", "parser_errors", "updated_at"])
    except EstimateParsingError as exc:
        estimate.status = Estimate.Status.FAILED
        estimate.progress = 100
        estimate.parser_errors = [str(exc)]
        estimate.updated_at = timezone.now()
        estimate.save(update_fields=["status", "progress", "parser_errors", "updated_at"])
        raise

    return len(items_payload)
