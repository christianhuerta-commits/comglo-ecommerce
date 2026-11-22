
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BarraNavegacion from "@/componentes/BarraNavegacion";

// Modalidades disponibles en ComGlo
type ModalidadCuenta = "b2c" | "b2b" | "vendedor";

export default function Registro() {
  const router = useRouter();

  // Modalidad seleccionada
  const [modalidadCuenta, setModalidadCuenta] =
    useState<ModalidadCuenta>("b2c");

  // Datos del usuario
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] =
    useState("");

  // Datos empresariales
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [identificacionFiscal, setIdentificacionFiscal] =
    useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");

  // Estado del formulario
  const [mensajeError, setMensajeError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Estilos reutilizables
  const estiloCampo =
    "mt-2 w-full rounded-lg border border-gray-300 " +
    "px-4 py-3 text-gray-900 outline-none " +
    "focus:border-purple-500 focus:ring-1 focus:ring-purple-500";

  const estiloEtiqueta =
    "block text-sm font-semibold text-gray-700";

  // Opciones de registro
  const opcionesCuenta: {
    valor: ModalidadCuenta;
    titulo: string;
    descripcion: string;
    icono: string;
  }[] = [
    {
      valor: "b2c",
      titulo: "Comprador personal",
      descripcion: "B2C · Compras individuales",
      icono: "🛍️",
    },
    {
      valor: "b2b",
      titulo: "Comprador empresarial",
      descripcion: "B2B · Compras para empresas",
      icono: "🏢",
    },
    {
      valor: "vendedor",
      titulo: "Vendedor",
      descripcion: "Publica y administra productos",
      icono: "🏪",
    },
  ];

  // Mostrar mensajes de validación enviados por Django
  const obtenerMensajeError = (datos: any): string => {
    const campos = [
      "nombre_usuario",
      "correo",
      "nombre",
      "contrasena",
      "nombre_empresa",
      "nombre_negocio",
      "identificacion_fiscal",
      "tipo_cuenta",
      "tipo_comprador",
      "non_field_errors",
    ];

    for (const campo of campos) {
      if (datos?.[campo]) {
        const mensaje = datos[campo];

        return Array.isArray(mensaje)
          ? mensaje.join(" ")
          : String(mensaje);
      }
    }

    return datos?.mensaje || datos?.detail ||
      "No fue posible crear la cuenta.";
  };

  // Registrar un nuevo usuario
  const registrarUsuario = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();
    setMensajeError("");

    // Validar las contraseñas
    if (contrasena !== confirmarContrasena) {
      setMensajeError("Las contraseñas no coinciden.");
      return;
    }

    if (contrasena.length < 8) {
      setMensajeError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    // Validar la empresa compradora
    if (
      modalidadCuenta === "b2b" &&
      !nombreEmpresa.trim()
    ) {
      setMensajeError(
        "Debes proporcionar el nombre de tu empresa."
      );
      return;
    }

    // Validar el negocio vendedor
    if (
      modalidadCuenta === "vendedor" &&
      !nombreNegocio.trim()
    ) {
      setMensajeError(
        "Debes proporcionar el nombre de tu negocio."
      );
      return;
    }

    const direccionApi = process.env.NEXT_PUBLIC_API_URL;

    if (!direccionApi) {
      setMensajeError(
        "No está configurada la dirección del servidor."
      );
      return;
    }

    setCargando(true);

    try {
      // Identificar el rol principal
      const tipoCuenta =
        modalidadCuenta === "vendedor"
          ? "vendedor"
          : "comprador";

      // Preparar la información para Django
      const datosRegistro = {
        nombre_usuario: correo.trim(),
        correo: correo.trim(),
        nombre: nombre.trim(),
        apellido: "",
        contrasena: contrasena,
        tipo_cuenta: tipoCuenta,

        // Modalidad B2B o B2C
        tipo_comprador:
          modalidadCuenta === "vendedor"
            ? "b2c"
            : modalidadCuenta,

        // Información del vendedor
        nombre_negocio:
          modalidadCuenta === "vendedor"
            ? nombreNegocio.trim()
            : "",

        // Información del comprador empresarial
        nombre_empresa:
          modalidadCuenta === "b2b"
            ? nombreEmpresa.trim()
            : "",

        identificacion_fiscal:
          modalidadCuenta === "b2b"
            ? identificacionFiscal.trim()
            : "",
      };

      // Enviar los datos al backend
      const respuesta = await fetch(
        `${direccionApi.replace(/\/$/, "")}/api/cuentas/registro/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosRegistro),
        }
      );

      const datos = await respuesta.json();

      // Comprobar el resultado
      if (!respuesta.ok) {
        setMensajeError(obtenerMensajeError(datos));
        return;
      }

      // Redirigir al inicio de sesión
      router.push("/iniciar-sesion");

    } catch (error) {
      console.error(
        "Error al registrar el usuario:",
        error
      );

      setMensajeError(
        "No se pudo conectar con el servidor. " +
        "Verifica que Django esté funcionando."
      );

    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <BarraNavegacion />

      <section className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-xl bg-white p-7 shadow-md">

          {/* Encabezado */}
          <div className="text-center">
            <div
              className="mb-2 text-3xl font-bold tracking-tight"
              aria-label="ComGlo"
            >
              <span className="text-purple-500">C</span>
              <span className="text-gray-900">om</span>
              <span className="text-purple-500">G</span>
              <span className="text-gray-900">lo</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Crear una cuenta
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Selecciona cómo deseas utilizar ComGlo.
            </p>
          </div>

          <form
            className="mt-6"
            onSubmit={registrarUsuario}
          >
            {/* Seleccionar modalidad */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-gray-700">
                ¿Qué tipo de cuenta deseas crear?
              </legend>

              <div className="grid grid-cols-1 gap-3">
                {opcionesCuenta.map((opcion) => (
                  <label
                    key={opcion.valor}
                    className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition ${
                      modalidadCuenta === opcion.valor
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="modalidad_cuenta"
                      value={opcion.valor}
                      checked={
                        modalidadCuenta === opcion.valor
                      }
                      onChange={() => {
                        setModalidadCuenta(opcion.valor);
                        setMensajeError("");
                      }}
                      className="sr-only"
                    />

                    <span
                      className="text-2xl"
                      aria-hidden="true"
                    >
                      {opcion.icono}
                    </span>

                    <div>
                      <span className="block text-sm font-semibold text-gray-900">
                        {opcion.titulo}
                      </span>

                      <span className="block text-xs text-gray-600">
                        {opcion.descripcion}
                      </span>
                    </div>

                    <span
                      className={`ml-auto h-4 w-4 rounded-full border-2 ${
                        modalidadCuenta === opcion.valor
                          ? "border-purple-600 bg-purple-600"
                          : "border-gray-300"
                      }`}
                      aria-hidden="true"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Nombre del usuario */}
            <div className="mt-5">
              <label
                htmlFor="nombre"
                className={estiloEtiqueta}
              >
                Nombre completo
              </label>

              <input
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(evento) =>
                  setNombre(evento.target.value)
                }
                required
                className={estiloCampo}
              />
            </div>

            {/* Campos exclusivos para compradores B2B */}
            {modalidadCuenta === "b2b" && (
              <>
                <div className="mt-4">
                  <label
                    htmlFor="nombreEmpresa"
                    className={estiloEtiqueta}
                  >
                    Nombre de la empresa
                  </label>

                  <input
                    id="nombreEmpresa"
                    type="text"
                    placeholder="Ej. Comercializadora Global"
                    value={nombreEmpresa}
                    onChange={(evento) =>
                      setNombreEmpresa(evento.target.value)
                    }
                    required
                    className={estiloCampo}
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="identificacionFiscal"
                    className={estiloEtiqueta}
                  >
                    Identificación fiscal (opcional)
                  </label>

                  <input
                    id="identificacionFiscal"
                    type="text"
                    placeholder="RFC u otro identificador fiscal"
                    value={identificacionFiscal}
                    onChange={(evento) =>
                      setIdentificacionFiscal(
                        evento.target.value
                      )
                    }
                    maxLength={30}
                    className={estiloCampo}
                  />
                </div>
              </>
            )}

            {/* Campo exclusivo para vendedores */}
            {modalidadCuenta === "vendedor" && (
              <div className="mt-4">
                <label
                  htmlFor="nombreNegocio"
                  className={estiloEtiqueta}
                >
                  Nombre del negocio
                </label>

                <input
                  id="nombreNegocio"
                  type="text"
                  placeholder="Nombre de tu tienda"
                  value={nombreNegocio}
                  onChange={(evento) =>
                    setNombreNegocio(evento.target.value)
                  }
                  required
                  className={estiloCampo}
                />
              </div>
            )}

            {/* Correo electrónico */}
            <div className="mt-4">
              <label
                htmlFor="correo"
                className={estiloEtiqueta}
              >
                Correo electrónico
              </label>

              <input
                id="correo"
                type="email"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(evento) =>
                  setCorreo(evento.target.value)
                }
                required
                className={estiloCampo}
              />
            </div>

            {/* Contraseña */}
            <div className="mt-4">
              <label
                htmlFor="contrasena"
                className={estiloEtiqueta}
              >
                Contraseña
              </label>

              <input
                id="contrasena"
                type="password"
                placeholder="Crea una contraseña"
                value={contrasena}
                onChange={(evento) =>
                  setContrasena(evento.target.value)
                }
                minLength={8}
                required
                className={estiloCampo}
              />
            </div>

            {/* Confirmar contraseña */}
            <div className="mt-4">
              <label
                htmlFor="confirmarContrasena"
                className={estiloEtiqueta}
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmarContrasena"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmarContrasena}
                onChange={(evento) =>
                  setConfirmarContrasena(
                    evento.target.value
                  )
                }
                minLength={8}
                required
                className={estiloCampo}
              />
            </div>

            {/* Mensaje de error */}
            {mensajeError && (
              <div
                role="alert"
                className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {mensajeError}
              </div>
            )}

            {/* Botón de registro */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-6 w-full rounded-lg bg-purple-500 px-4 py-3 font-semibold text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando
                ? "Creando cuenta..."
                : "Crear cuenta"}
            </button>
          </form>

          {/* Enlace al inicio de sesión */}
          <div className="mt-6 border-t border-gray-200 pt-5 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?
            </p>

            <Link
              href="/iniciar-sesion"
              className="mt-2 inline-block text-sm font-semibold text-purple-600 transition hover:text-purple-700 hover:underline"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
