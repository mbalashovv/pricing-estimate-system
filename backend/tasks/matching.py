from celery import shared_task

from apps.estimates.models import Estimate
from services.matching.matcher import run_estimate_matching


@shared_task(bind=True)
def match_estimate_task(self, estimate_id: int) -> dict:
    estimate = Estimate.objects.get(pk=estimate_id)
    processed = run_estimate_matching(estimate, task_id=self.request.id)
    return {
        "estimate_id": estimate_id,
        "matched_items": processed,
        "status": Estimate.MatchingStatus.COMPLETED,
    }
