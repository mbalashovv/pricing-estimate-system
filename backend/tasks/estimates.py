from celery import shared_task

from apps.estimates.models import Estimate
from services.estimate.processor import parse_estimate


@shared_task(bind=True)
def parse_estimate_task(self, estimate_id: int) -> dict:
    estimate = Estimate.objects.get(pk=estimate_id)
    parse_estimate(estimate, task_id=self.request.id)
    return {
        "estimate_id": estimate_id,
        "status": Estimate.Status.COMPLETED,
    }
