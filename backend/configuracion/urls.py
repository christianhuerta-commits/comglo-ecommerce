
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path("admin/", admin.site.urls),

    # Rutas de la aplicación de cuentas
    path("api/cuentas/", include("cuentas.urls")),

    # Rutas de los productos
    path("api/productos/", include("productos.urls")),
]


# Permitir visualizar imágenes durante el desarrollo local
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
