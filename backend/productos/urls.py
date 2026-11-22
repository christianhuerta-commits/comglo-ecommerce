from django.urls import path

from .views import (
    CatalogoProductosVista,
    ProductosVendedorVista,
    DetalleProductoVendedorVista,
)

urlpatterns = [
    # Catálogo para compradores
    path(
        "catalogo/",
        CatalogoProductosVista.as_view(),
        name="catalogo-productos"
    ),

    # Consultar y publicar productos del vendedor
    path(
        "vendedor/",
        ProductosVendedorVista.as_view(),
        name="productos-vendedor"
    ),

    # Consultar, editar o retirar productos propios
    path(
        "vendedor/<int:pk>/",
        DetalleProductoVendedorVista.as_view(),
        name="detalle-producto-vendedor"
    ),
]