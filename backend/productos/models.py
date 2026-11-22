
from django.conf import settings
from django.db import models


class Producto(models.Model):

    # Países disponibles
    PAISES_ORIGEN = [
        ("Estados Unidos", "Estados Unidos"),
        ("China", "China"),
    ]

    # Categorías de los productos
    CATEGORIAS = [
        ("computadoras", "Computadoras"),
        ("celulares", "Celulares"),
        ("linea_blanca", "Línea blanca"),
        ("electronica", "Electrónica"),
        ("hogar", "Hogar"),
        ("otros", "Otros"),
    ]

    # Usuario que publica el producto
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="productos_publicados"
    )

    nombre = models.CharField(max_length=150)

    categoria = models.CharField(
        max_length=30,
        choices=CATEGORIAS,
        default="otros"
    )

    descripcion = models.TextField()

    precio_individual = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    precio_mayoreo = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    cantidad_minima_mayoreo = models.PositiveIntegerField(
        default=10
    )

    existencias = models.PositiveIntegerField(
        default=0
    )

    pais_origen = models.CharField(
        max_length=50,
        choices=PAISES_ORIGEN
    )

    imagen = models.ImageField(
        upload_to="productos/",
        null=True,
        blank=True
    )

    activo = models.BooleanField(default=True)

    fecha_creacion = models.DateTimeField(
        auto_now_add=True
    )

    fecha_actualizacion = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.nombre
