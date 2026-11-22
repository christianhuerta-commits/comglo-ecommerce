
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  tipo_cuenta: "comprador" | "vendedor";
  tipo_comprador?: "b2b" | "b2c";
  nombre_negocio?: string;
  nombre_empresa?: string;
}

// Ícono del carrito de compras
function IconoCarrito() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2 2h2l2.4 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 6H5" />
    </svg>
  );
}

// Logotipo de ComGlo
function NombreComercio() {
  return (
    <Link
      href="/"
      className="text-xl font-bold tracking-tight"
      aria-label="ComGlo - Inicio"
    >
      <span className="text-purple-400">C</span>
      <span className="text-white">om</span>
      <span className="text-purple-400">G</span>
      <span className="text-white">lo</span>
    </Link>
  );
}

export default function BarraNavegacion() {
  const router = useRouter();
  const rutaActual = usePathname();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Recuperar la sesión del navegador
  const actualizarUsuario = useCallback(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const token = localStorage.getItem("token_acceso");

    if (!usuarioGuardado || !token) {
      setUsuario(null);
      return;
    }

    try {
      const datos: Usuario = JSON.parse(usuarioGuardado);
      setUsuario(datos);
    } catch {
      localStorage.removeItem("usuario");
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    actualizarUsuario();

    const escucharCambioSesion = () => {
      actualizarUsuario();
    };

    window.addEventListener(
      "comglo:sesion-actualizada",
      escucharCambioSesion
    );

    window.addEventListener("storage", escucharCambioSesion);

    return () => {
      window.removeEventListener(
        "comglo:sesion-actualizada",
        escucharCambioSesion
      );

      window.removeEventListener(
        "storage",
        escucharCambioSesion
      );
    };
  }, [rutaActual, actualizarUsuario]);

  // Cerrar sesión sin modificar las demás funciones
  const cerrarSesion = () => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token_acceso");
    localStorage.removeItem("token_actualizacion");

    setUsuario(null);
    setMenuAbierto(false);

    window.dispatchEvent(
      new Event("comglo:sesion-actualizada")
    );

    router.replace("/iniciar-sesion");
    router.refresh();
  };

  const esVendedor = usuario?.tipo_cuenta === "vendedor";

  const nombreMostrar = esVendedor
    ? usuario?.nombre_negocio || usuario?.nombre
    : usuario?.nombre;

  // Estilos de navegación
  const estiloEnlace =
    "text-sm font-medium text-gray-200 transition-colors hover:text-purple-300";

  const estiloActivo =
    "text-sm font-semibold text-purple-300";

  function obtenerEstilo(ruta: string) {
    return rutaActual === ruta ? estiloActivo : estiloEnlace;
  }

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <nav className="relative z-50 bg-slate-900 px-6 py-4 text-white shadow-md">
      <div className="mx-auto max-w-7xl">

        {/* Barra principal */}
        <div className="flex items-center justify-between">

          <NombreComercio />

          {/* Navegación para computadora */}
          <div className="hidden items-center gap-7 md:flex">

            <Link href="/" className={obtenerEstilo("/")}>
              Inicio
            </Link>


            {!esVendedor && (
              <Link
                href="/catalogo"
                className={obtenerEstilo("/catalogo")}
              >
                Catálogo
              </Link>
            )}

            {usuario ? (
              <>
                {esVendedor ? (
                  <Link
                    href="/panel-vendedor"
                    className={obtenerEstilo("/panel-vendedor")}
                  >
                    Mi panel
                  </Link>
                ) : (
                  <Link
                    href="/carrito"
                    className="flex items-center transition hover:text-purple-300"
                    aria-label="Ir al carrito de compras"
                    title="Carrito de compras"
                  >
                    <IconoCarrito />
                  </Link>
                )}

                <span className="text-sm text-purple-200">
                  Hola, {nombreMostrar}
                </span>

                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="text-sm font-medium text-gray-200 transition hover:text-purple-300"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/iniciar-sesion"
                className={obtenerEstilo("/iniciar-sesion")}
              >
                Acceder
              </Link>
            )}
          </div>

          {/* Menú para dispositivos móviles */}
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="rounded-lg border border-white/20 p-2 text-xl transition hover:border-purple-400 md:hidden"
            aria-label={
              menuAbierto ? "Cerrar menú" : "Abrir menú"
            }
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? "✕" : "☰"}
          </button>
        </div>

        {/* Navegación para celular */}
        {menuAbierto && (
          <div className="mt-4 flex flex-col gap-5 border-t border-white/10 py-5 md:hidden">

            <Link
              href="/"
              className={obtenerEstilo("/")}
              onClick={cerrarMenu}
            >
              Inicio
            </Link>


            {!esVendedor && (
              <Link
                href="/catalogo"
                className={obtenerEstilo("/catalogo")}
                onClick={cerrarMenu}
              >
                Catálogo
              </Link>
            )}

            {usuario ? (
              <>
                {esVendedor ? (
                  <Link
                    href="/panel-vendedor"
                    className={obtenerEstilo("/panel-vendedor")}
                    onClick={cerrarMenu}
                  >
                    Mi panel
                  </Link>
                ) : (
                  <Link
                    href="/carrito"
                    className={estiloEnlace}
                    onClick={cerrarMenu}
                  >
                    Carrito de compras
                  </Link>
                )}

                <span className="text-sm text-purple-200">
                  Hola, {nombreMostrar}
                </span>

                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="text-left text-sm font-medium text-gray-200 hover:text-purple-300"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/iniciar-sesion"
                className={obtenerEstilo("/iniciar-sesion")}
                onClick={cerrarMenu}
              >
                Acceder
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
