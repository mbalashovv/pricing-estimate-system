from rest_framework import serializers

from apps.suppliers.models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = (
            "id",
            "name",
            "inn",
            "currency",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
