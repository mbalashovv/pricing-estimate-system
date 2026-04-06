from rest_framework import filters, viewsets

from api.suppliers.serializers import SupplierSerializer
from apps.suppliers.models import Supplier


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "inn")
    ordering_fields = ("name", "created_at")
    ordering = ("name",)
