from django.db import models

from core.models import TimeStampedModel


class Project(TimeStampedModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
