from django.contrib import admin

from apps.catalog.models import CatalogGroup, CatalogItem


@admin.register(CatalogGroup)
class CatalogGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ("id", "article", "name", "unit", "group", "created_at")
    search_fields = ("article", "name")
    list_filter = ("group",)
    autocomplete_fields = ("group",)
    ordering = ("name",)
