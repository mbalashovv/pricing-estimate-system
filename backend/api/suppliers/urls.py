from api.suppliers.views import SupplierViewSet


def register_routes(router) -> None:
    router.register("suppliers", SupplierViewSet, basename="supplier")
