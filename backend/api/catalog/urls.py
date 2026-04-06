from api.catalog.views import CatalogGroupViewSet, CatalogItemViewSet


def register_routes(router) -> None:
    router.register("catalog-groups", CatalogGroupViewSet, basename="catalog-group")
    router.register("catalog-items", CatalogItemViewSet, basename="catalog-item")
