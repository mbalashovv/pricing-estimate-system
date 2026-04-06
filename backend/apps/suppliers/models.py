from django.db import models

from core.models import TimeStampedModel


class Supplier(TimeStampedModel):
    class Currency(models.TextChoices):
        RUB = "RUB", "Russian Ruble"
        USD = "USD", "US Dollar"
        EUR = "EUR", "Euro"

    name = models.CharField(max_length=255)
    inn = models.CharField(max_length=12, unique=True)
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.RUB,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
