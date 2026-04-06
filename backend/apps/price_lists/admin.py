from django.contrib import admin

from apps.price_lists.models import PriceList, PriceListItem


class PriceListItemInline(admin.TabularInline):
    model = PriceListItem
    extra = 0
    fields = ("article", "name", "unit", "price", "catalog_item")
    autocomplete_fields = ("catalog_item",)
    show_change_link = True


@admin.register(PriceList)
class PriceListAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "supplier", "status", "uploaded_at")
    search_fields = ("name", "supplier__name")
    list_filter = ("status", "supplier")
    autocomplete_fields = ("supplier",)
    inlines = (PriceListItemInline,)
    ordering = ("-uploaded_at",)


@admin.register(PriceListItem)
class PriceListItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "article", "price", "price_list", "catalog_item")
    search_fields = ("name", "article", "price_list__name", "price_list__supplier__name")
    list_filter = ("price_list__supplier",)
    autocomplete_fields = ("price_list", "catalog_item")
    ordering = ("id",)
