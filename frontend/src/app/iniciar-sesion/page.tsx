
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import BarraNavegacion from "@/componentes/BarraNavegacion";

export default function IniciarSesion() {
  const router = useRouter();

  // Variables para almacenar los datos del formulario
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Función para iniciar sesión
  const iniciarSesion = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();
    setMensajeError("");
    setCargando(true);

    try {
      // Enviar los datos al servidor Django
      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cuentas/iniciar-sesion/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            correo: correo,
            contrasena: contrasena,
          }),
        }
      );

      const datos = await respuesta.json();

      // Comprobar si el inicio de sesión fue correcto
      if (!respuesta.ok) {
        setMensajeError(
          datos.mensaje ||
            "Correo electrónico o contraseña incorrectos."
        );
        return;
      }

      // Guardar la información del usuario autenticado
      localStorage.setItem(
        "usuario",
        JSON.stringify(datos.usuario)
      );

      // Guardar los tokens de autenticación JWT
      localStorage.setItem(
        "token_acceso",
        datos.tokens.acceso
      );

      localStorage.setItem(
        "token_actualizacion",
        datos.tokens.actualizacion
      );

      // Identificar el tipo de cuenta
      const tipoCuenta = datos.usuario.tipo_cuenta;

      // Redirigir al vendedor a su panel
      if (tipoCuenta === "vendedor") {
        router.replace("/panel-vendedor");
      } else {
        // Compradores B2B y B2C
        router.replace("/catalogo");
      }

      router.refresh();

    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      setMensajeError(
        "No se pudo conectar con el servidor. Inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-purple-50">

      {/* Barra de navegación */}
      <BarraNavegacion />

      {/* Contenedor principal */}
      <section className="flex min-h-[calc(100vh-56px)] items-center justify-center px-6 py-10">

        <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-8 shadow-lg">

          {/* Encabezado del formulario */}
          <div className="text-center">

            {/* Logotipo de ComGlo */}
            <div
              className="mb-3 text-3xl font-bold tracking-tight"
              aria-label="ComGlo"
            >
              <span className="text-purple-600">C</span>
              <span className="text-gray-900">om</span>
              <span className="text-purple-600">G</span>
              <span className="text-gray-900">lo</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Iniciar sesión
            </h1>

            <p className="mt-3 text-gray-600">
              Ingresa a tu cuenta de ComGlo.
            </p>
          </div>

          {/* Formulario de inicio de sesión */}
          <form className="mt-8" onSubmit={iniciarSesion}>

            {/* Campo de correo electrónico */}
            <div>
              <label
                htmlFor="correo"
                className="block font-semibold text-gray-700"
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
                className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* Campo de contraseña */}
            <div className="mt-5">
              <label
                htmlFor="contrasena"
                className="block font-semibold text-gray-700"
              >
                Contraseña
              </label>

              <input
                id="contrasena"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={contrasena}
                onChange={(evento) =>
                  setContrasena(evento.target.value)
                }
                required
                className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* Mensaje de error */}
            {mensajeError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {mensajeError}
              </div>
            )}

            {/* Botón morado para iniciar sesión */}
            <button
              type="submit"
              disabled={cargando}
              className="mt-7 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando
                ? "Iniciando sesión..."
                : "Iniciar sesión"}
            </button>
          </form>

          {/* Enlace para crear una cuenta */}
          <div className="mt-6 border-t border-purple-100 pt-6 text-center">

            <p className="text-gray-600">
              ¿No tienes una cuenta?
            </p>

            <Link
              href="/registro"
              className="mt-2 inline-block font-semibold text-purple-600 transition hover:text-purple-700 hover:underline"
            >
              Crear una cuenta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
