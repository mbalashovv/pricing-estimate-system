from celery import shared_task

from apps.price_lists.models import PriceList
from services.price_list.matcher import run_price_list_matching
from services.price_list.processor import parse_price_list


@shared_task(bind=True)
def parse_price_list_task(self, price_list_id: int) -> dict:
    price_list = PriceList.objects.get(pk=price_list_id)
    parse_price_list(price_list, task_id=self.request.id)
    return {
        "price_list_id": price_list_id,
        "status": PriceList.Status.COMPLETED,
    }


@shared_task(bind=True)
def match_price_list_task(self, price_list_id: int) -> dict:
    price_list = PriceList.objects.get(pk=price_list_id)
    try:
        processed = run_price_list_matching(price_list, task_id=self.request.id)
    except Exception:
        price_list.matching_status = PriceList.MatchingStatus.FAILED
        price_list.matching_progress = 100
        price_list.save(update_fields=["matching_status", "matching_progress", "updated_at"])
        raise
    return {
        "price_list_id": price_list_id,
        "matched_items": processed,
        "status": PriceList.MatchingStatus.COMPLETED,
    }
