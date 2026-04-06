from rest_framework.routers import DefaultRouter

from api.catalog.urls import register_routes as register_catalog_routes
from api.estimates.urls import register_routes as register_estimate_routes
from api.price_lists.urls import register_routes as register_price_list_routes
from api.projects.urls import register_routes as register_project_routes
from api.suppliers.urls import register_routes as register_supplier_routes

router = DefaultRouter()

register_supplier_routes(router)
register_catalog_routes(router)
register_project_routes(router)
register_price_list_routes(router)
register_estimate_routes(router)
