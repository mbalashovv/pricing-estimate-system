from api.estimates.views import EstimateItemViewSet, EstimateViewSet


def register_routes(router) -> None:
    router.register("estimates", EstimateViewSet, basename="estimate")
    router.register("estimate-items", EstimateItemViewSet, basename="estimate-item")
