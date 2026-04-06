from api.price_lists.views import PriceListItemViewSet, PriceListViewSet


def register_routes(router) -> None:
    router.register("price-lists", PriceListViewSet, basename="price-list")
    router.register("price-list-items", PriceListItemViewSet, basename="price-list-item")
