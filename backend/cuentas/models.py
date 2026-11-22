
from django.conf import settings
from django.db import models


# Perfil adicional para compradores y vendedores
class PerfilUsuario(models.Model):

    # Roles principales de los usuarios
    TIPOS_CUENTA = [
        ("comprador", "Comprador"),
        ("vendedor", "Vendedor"),
    ]

    # Modalidades de compra
    TIPOS_COMPRADOR = [
        ("b2c", "Comprador personal (B2C)"),
        ("b2b", "Comprador empresarial (B2B)"),
    ]

    # Relación con el usuario de Django
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil"
    )

    # Identifica si el usuario compra o vende
    tipo_cuenta = models.CharField(
        max_length=20,
        choices=TIPOS_CUENTA,
        default="comprador"
    )

    # Identifica si el comprador es B2B o B2C
    tipo_comprador = models.CharField(
        max_length=10,
        choices=TIPOS_COMPRADOR,
        default="b2c",
        blank=True
    )

    # Nombre comercial para vendedores
    nombre_negocio = models.CharField(
        max_length=150,
        blank=True,
        default=""
    )

    # Nombre de la empresa para compradores B2B
    nombre_empresa = models.CharField(
        max_length=150,
        blank=True,
        default=""
    )

    # Identificación fiscal de la empresa (opcional)
    identificacion_fiscal = models.CharField(
        max_length=30,
        blank=True,
        default=""
    )

    def __str__(self):

        if self.tipo_cuenta == "vendedor":
            return (
                f"{self.usuario.username} - "
                f"Vendedor - {self.nombre_negocio}"
            )

        return (
            f"{self.usuario.username} - "
            f"Comprador {self.tipo_comprador.upper()}"
        )
