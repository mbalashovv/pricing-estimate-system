from rest_framework import filters, viewsets

from api.catalog.serializers import CatalogGroupSerializer, CatalogItemSerializer
from apps.catalog.models import CatalogGroup, CatalogItem


class CatalogGroupViewSet(viewsets.ModelViewSet):
    queryset = CatalogGroup.objects.all()
    serializer_class = CatalogGroupSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
    ordering = ("name",)


class CatalogItemViewSet(viewsets.ModelViewSet):
    queryset = CatalogItem.objects.select_related("group").all()
    serializer_class = CatalogItemSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("article", "name", "group__name")
    ordering_fields = ("article", "name", "created_at")
    ordering = ("name",)
