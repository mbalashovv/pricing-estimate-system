from django.contrib import admin

from apps.matching.models import EstimateItemMatch


@admin.register(EstimateItemMatch)
class EstimateItemMatchAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "estimate_item",
        "catalog_item",
        "status",
        "method",
        "confidence",
        "matched_at",
    )
    search_fields = (
        "estimate_item__name",
        "estimate_item__article",
        "catalog_item__name",
        "catalog_item__article",
    )
    list_filter = ("status", "method")
    autocomplete_fields = ("estimate_item", "catalog_item")
    ordering = ("id",)
