from api.projects.views import ProjectViewSet


def register_routes(router) -> None:
    router.register("projects", ProjectViewSet, basename="project")
