from django.contrib import admin
from django.conf import settings
from django.views.static import serve
from django.urls import include, path, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("api.urls")),
]

if settings.DEBUG or settings.SERVE_MEDIA:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]
