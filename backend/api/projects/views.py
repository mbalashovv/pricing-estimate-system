from rest_framework import filters, viewsets

from api.projects.serializers import ProjectSerializer
from apps.projects.models import Project


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("name", "description")
    ordering_fields = ("name", "created_at")
    ordering = ("name",)
