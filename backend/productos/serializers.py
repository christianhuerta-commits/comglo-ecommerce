
from rest_framework import serializers
from .models import Producto


class ProductoSerializer(serializers.ModelSerializer):

    imagen_url = serializers.SerializerMethodField()

    # Nombre del vendedor asociado al producto
    nombre_vendedor = serializers.SerializerMethodField()

    # Nombre visible de la categoría
    nombre_categoria = serializers.CharField(
        source="get_categoria_display",
        read_only=True
    )

    class Meta:
        model = Producto

        fields = [
            "id",
            "nombre",
            "categoria",
            "nombre_categoria",
            "nombre_vendedor",
            "descripcion",
            "precio_individual",
            "precio_mayoreo",
            "cantidad_minima_mayoreo",
            "existencias",
            "pais_origen",
            "imagen",
            "imagen_url",
            "activo",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

        read_only_fields = [
            "id",
            "nombre_categoria",
            "nombre_vendedor",
            "imagen_url",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    # Obtener el nombre del vendedor
    def get_nombre_vendedor(self, producto):

        vendedor = producto.vendedor

        nombre = vendedor.get_full_name().strip()

        if nombre:
            return nombre

        return vendedor.get_username()

    # Obtener URL de la imagen
    def get_imagen_url(self, producto):

        if not producto.imagen:
            return None

        solicitud = self.context.get("request")

        if solicitud:
            return solicitud.build_absolute_uri(
                producto.imagen.url
            )

        return producto.imagen.url

    # Validar precio individual
    def validate_precio_individual(self, valor):

        if valor <= 0:
            raise serializers.ValidationError(
                "El precio individual debe ser mayor que cero."
            )

        return valor

    # Validar precio de mayoreo
    def validate_precio_mayoreo(self, valor):

        if valor <= 0:
            raise serializers.ValidationError(
                "El precio de mayoreo debe ser mayor que cero."
            )

        return valor

    # Validar cantidad mínima
    def validate_cantidad_minima_mayoreo(self, valor):

        if valor < 1:
            raise serializers.ValidationError(
                "La cantidad mínima debe ser mayor que cero."
            )

        return valor
