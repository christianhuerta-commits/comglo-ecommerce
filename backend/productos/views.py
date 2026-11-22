
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)

from .models import Producto
from .serializers import ProductoSerializer


# Verificar que el usuario sea vendedor
class PermisoVendedor(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        perfil = getattr(request.user, "perfil", None)

        return (
            perfil is not None
            and perfil.tipo_cuenta == "vendedor"
        )


# Mostrar productos disponibles a los compradores
class CatalogoProductosVista(generics.ListAPIView):

    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Producto.objects.filter(
            activo=True
        ).order_by("-fecha_creacion")


# Consultar y publicar productos del vendedor
class ProductosVendedorVista(generics.ListCreateAPIView):

    serializer_class = ProductoSerializer
    permission_classes = [PermisoVendedor]

    # Permitir formularios con imágenes y datos JSON
    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        return Producto.objects.filter(
            vendedor=self.request.user
        ).order_by("-fecha_creacion")

    def perform_create(self, serializer):
        serializer.save(
            vendedor=self.request.user
        )


# Modificar o retirar productos propios
class DetalleProductoVendedorVista(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = ProductoSerializer
    permission_classes = [PermisoVendedor]

    # Permitir actualizar fotografías de productos
    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        return Producto.objects.filter(
            vendedor=self.request.user
        )

    def perform_destroy(self, instancia):
        # Retirar del catálogo sin borrar de PostgreSQL
        instancia.activo = False
        instancia.save(update_fields=["activo"])
