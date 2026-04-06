from django.contrib import admin

from apps.estimates.models import Estimate, EstimateItem


class EstimateItemInline(admin.TabularInline):
    model = EstimateItem
    extra = 0
    fields = ("article", "name", "unit", "quantity", "material_price", "labor_price")
    show_change_link = True


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "project", "status", "uploaded_at")
    search_fields = ("name", "project__name")
    list_filter = ("status", "project")
    autocomplete_fields = ("project",)
    inlines = (EstimateItemInline,)
    ordering = ("-uploaded_at",)


@admin.register(EstimateItem)
class EstimateItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "article", "quantity", "estimate")
    search_fields = ("name", "article", "estimate__name", "estimate__project__name")
    list_filter = ("estimate__project",)
    autocomplete_fields = ("estimate",)
    ordering = ("id",)
