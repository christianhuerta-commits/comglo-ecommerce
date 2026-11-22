
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario


# Serializador para registrar usuarios de ComGlo
class RegistroUsuarioSerializer(serializers.ModelSerializer):

    nombre_usuario = serializers.CharField(
        source="username"
    )

    correo = serializers.EmailField(
        source="email"
    )

    nombre = serializers.CharField(
        source="first_name"
    )

    apellido = serializers.CharField(
        source="last_name",
        required=False,
        allow_blank=True
    )

    contrasena = serializers.CharField(
        write_only=True,
        min_length=8
    )

    # Rol principal: comprador o vendedor
    tipo_cuenta = serializers.ChoiceField(
        choices=PerfilUsuario.TIPOS_CUENTA,
        default="comprador"
    )

    # Modalidad de compra: B2B o B2C
    tipo_comprador = serializers.ChoiceField(
        choices=PerfilUsuario.TIPOS_COMPRADOR,
        required=False,
        default="b2c"
    )

    # Nombre comercial para vendedores
    nombre_negocio = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default=""
    )

    # Nombre de la empresa para compradores B2B
    nombre_empresa = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
        default=""
    )

    # Identificación fiscal opcional
    identificacion_fiscal = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        default=""
    )

    class Meta:
        model = User

        fields = [
            "nombre_usuario",
            "correo",
            "nombre",
            "apellido",
            "contrasena",
            "tipo_cuenta",
            "tipo_comprador",
            "nombre_negocio",
            "nombre_empresa",
            "identificacion_fiscal",
        ]

    # Validar que el nombre de usuario no exista
    def validate_nombre_usuario(self, valor):

        if User.objects.filter(username=valor).exists():
            raise serializers.ValidationError(
                "Este nombre de usuario ya está registrado."
            )

        return valor

    # Validar que el correo no esté registrado
    def validate_correo(self, valor):

        if User.objects.filter(email__iexact=valor).exists():
            raise serializers.ValidationError(
                "Este correo electrónico ya está registrado."
            )

        return valor

    # Validar los datos según el tipo de cuenta
    def validate(self, datos):

        tipo_cuenta = datos.get(
            "tipo_cuenta",
            "comprador"
        )

        tipo_comprador = datos.get(
            "tipo_comprador",
            "b2c"
        )

        nombre_negocio = datos.get(
            "nombre_negocio",
            ""
        ).strip()

        nombre_empresa = datos.get(
            "nombre_empresa",
            ""
        ).strip()

        identificacion_fiscal = datos.get(
            "identificacion_fiscal",
            ""
        ).strip()

        # Validaciones para vendedores
        if tipo_cuenta == "vendedor":

            if not nombre_negocio:
                raise serializers.ValidationError({
                    "nombre_negocio":
                        "Debes proporcionar el nombre del negocio."
                })

            # Los vendedores no tienen modalidad de comprador
            datos["tipo_comprador"] = ""
            datos["nombre_negocio"] = nombre_negocio
            datos["nombre_empresa"] = ""
            datos["identificacion_fiscal"] = ""

        # Validaciones para compradores
        else:

            datos["nombre_negocio"] = ""
            datos["tipo_comprador"] = tipo_comprador

            # Compradores empresariales B2B
            if tipo_comprador == "b2b":

                if not nombre_empresa:
                    raise serializers.ValidationError({
                        "nombre_empresa":
                            "Debes proporcionar el nombre de la empresa."
                    })

                datos["nombre_empresa"] = nombre_empresa
                datos["identificacion_fiscal"] = (
                    identificacion_fiscal
                )

            # Compradores personales B2C
            else:

                datos["nombre_empresa"] = ""
                datos["identificacion_fiscal"] = ""

        return datos

    # Crear el usuario y su perfil en una transacción
    @transaction.atomic
    def create(self, datos_validados):

        tipo_cuenta = datos_validados.pop(
            "tipo_cuenta",
            "comprador"
        )

        tipo_comprador = datos_validados.pop(
            "tipo_comprador",
            "b2c"
        )

        nombre_negocio = datos_validados.pop(
            "nombre_negocio",
            ""
        )

        nombre_empresa = datos_validados.pop(
            "nombre_empresa",
            ""
        )

        identificacion_fiscal = datos_validados.pop(
            "identificacion_fiscal",
            ""
        )

        contrasena = datos_validados.pop(
            "contrasena"
        )

        # Crear el usuario de Django
        usuario = User(**datos_validados)
        usuario.set_password(contrasena)
        usuario.save()

        # Crear el perfil correspondiente en ComGlo
        PerfilUsuario.objects.create(
            usuario=usuario,
            tipo_cuenta=tipo_cuenta,
            tipo_comprador=tipo_comprador,
            nombre_negocio=nombre_negocio,
            nombre_empresa=nombre_empresa,
            identificacion_fiscal=identificacion_fiscal
        )

        return usuario
