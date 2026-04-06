from django.db import transaction
from django.utils import timezone

from apps.price_lists.models import PriceList, PriceListItem
from services.price_list.parser import PriceListParsingError, build_items_payload


def parse_price_list(price_list: PriceList, task_id: str | None = None) -> int:
    try:
        price_list.status = PriceList.Status.PROCESSING
        price_list.progress = 25
        if task_id:
            price_list.parse_task_id = task_id
        price_list.parser_errors = []
        price_list.matching_status = PriceList.MatchingStatus.PENDING
        price_list.matching_progress = 0
        price_list.matching_task_id = ""
        price_list.updated_at = timezone.now()
        price_list.save(
            update_fields=[
                "status",
                "progress",
                "parse_task_id",
                "parser_errors",
                "matching_status",
                "matching_progress",
                "matching_task_id",
                "updated_at",
            ]
        )

        items_payload = build_items_payload(
            file_path=price_list.source_file.path,
            mapping=price_list.column_mapping,
        )

        with transaction.atomic():
            price_list.items.all().delete()
            PriceListItem.objects.bulk_create(
                [PriceListItem(price_list=price_list, **item_payload) for item_payload in items_payload]
            )
            price_list.status = PriceList.Status.COMPLETED
            price_list.progress = 100
            price_list.parser_errors = []
            price_list.updated_at = timezone.now()
            price_list.save(update_fields=["status", "progress", "parser_errors", "updated_at"])
    except PriceListParsingError as exc:
        price_list.status = PriceList.Status.FAILED
        price_list.progress = 100
        price_list.parser_errors = [str(exc)]
        price_list.updated_at = timezone.now()
        price_list.save(update_fields=["status", "progress", "parser_errors", "updated_at"])
        raise

    return len(items_payload)
