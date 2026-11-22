
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import BarraNavegacion from "@/componentes/BarraNavegacion";
import { obtenerClaveCarrito } from "@/lib/carritoUsuario";

// Productos guardados en el carrito
interface ProductoCarrito {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  pais_origen?: string;
  origen?: string;
  imagen_url?: string | null;
}

// Respuesta del cálculo de importación
interface ResultadoLandedCost {
  subtotal_productos: number | string;
  transporte: number | string;
  aranceles: number | string;
  impuestos: number | string;
  otros_costos: number | string;
  costo_total: number | string;
}

// Obtener el origen de un producto
function obtenerOrigenProducto(
  producto: ProductoCarrito
): string {
  return (
    producto.pais_origen ||
    producto.origen ||
    ""
  ).trim();
}

// Mostrar importes con dos decimales
function formatearDinero(
  cantidad: number | string
): string {
  return Number(cantidad).toFixed(2);
}

export default function CostoImportacion() {
  const router = useRouter();

  const [verificandoSesion, setVerificandoSesion] =
    useState(true);

  const [productos, setProductos] =
    useState<ProductoCarrito[]>([]);

  const [paisOrigen, setPaisOrigen] =
    useState("");

  const [paisDestino, setPaisDestino] =
    useState("México");

  const [metodoTransporte, setMetodoTransporte] =
    useState("maritimo");

  const [resultado, setResultado] =
    useState<ResultadoLandedCost | null>(null);

  const [calculando, setCalculando] =
    useState(false);

  const [mensajeError, setMensajeError] =
    useState("");

  // Obtener los países presentes en el carrito
  const paisesOrigen = Array.from(
    new Set(
      productos
        .map(obtenerOrigenProducto)
        .filter((pais) => pais.length > 0)
    )
  );

  const tieneVariosOrigenes =
    paisesOrigen.length > 1;

  const tieneOrigenDesconocido =
    productos.some(
      (producto) =>
        obtenerOrigenProducto(producto) === ""
    );

  // Calcular subtotal de los productos
  const subtotalCarrito = productos.reduce(
    (total, producto) =>
      total +
      Number(producto.precio) *
        Number(producto.cantidad),
    0
  );

  // Calcular cantidad total de unidades
  const totalUnidades = productos.reduce(
    (total, producto) =>
      total + Number(producto.cantidad),
    0
  );

  // Verificar sesión y recuperar el carrito individual
  useEffect(() => {
    const tokenAcceso =
      localStorage.getItem("token_acceso");

    const usuarioGuardado =
      localStorage.getItem("usuario");

    if (!tokenAcceso || !usuarioGuardado) {
      router.replace("/iniciar-sesion");
      return;
    }

    try {
      const usuario = JSON.parse(usuarioGuardado);

      if (usuario.tipo_cuenta === "vendedor") {
        router.replace("/panel-vendedor");
        return;
      }

      if (usuario.tipo_cuenta !== "comprador") {
        router.replace("/iniciar-sesion");
        return;
      }

      // Recuperar el carrito exclusivo del usuario
      const claveCarrito = obtenerClaveCarrito();

      const carritoGuardado =
        localStorage.getItem(claveCarrito);

      let productosCarrito: ProductoCarrito[] = [];

      if (carritoGuardado) {
        const datos = JSON.parse(carritoGuardado);

        productosCarrito = Array.isArray(datos)
          ? datos
          : [];
      }

      setProductos(productosCarrito);

      // Identificar países de origen
      const paisesDetectados = Array.from(
        new Set(
          productosCarrito
            .map(obtenerOrigenProducto)
            .filter((pais) => pais.length > 0)
        )
      );

      const productosSinOrigen =
        productosCarrito.some(
          (producto) =>
            obtenerOrigenProducto(producto) === ""
        );

      // Seleccionar automáticamente si todos
      // los productos tienen el mismo origen
      if (
        paisesDetectados.length === 1 &&
        !productosSinOrigen
      ) {
        setPaisOrigen(paisesDetectados[0]);
      } else {
        setPaisOrigen("");
      }

      setVerificandoSesion(false);
    } catch (error) {
      console.error(
        "Error al recuperar el carrito:",
        error
      );

      setProductos([]);
      setPaisOrigen("");

      setMensajeError(
        "No fue posible recuperar los productos del carrito."
      );

      setVerificandoSesion(false);
    }
  }, [router]);

  // Solicitar el cálculo al servidor
  const solicitarLandedCost = async () => {
    setMensajeError("");
    setResultado(null);

    if (productos.length === 0) {
      setMensajeError(
        "No hay productos en tu carrito."
      );
      return;
    }

    if (tieneVariosOrigenes) {
      setMensajeError(
        "Tu carrito contiene productos de distintos países. " +
        "Para calcular correctamente los costos, " +
        "realiza el cálculo por país de origen."
      );
      return;
    }

    if (tieneOrigenDesconocido) {
      setMensajeError(
        "Hay productos sin país de origen. " +
        "Verifica sus datos antes de continuar."
      );
      return;
    }

    if (!paisOrigen) {
      setMensajeError(
        "No se pudo identificar el país de origen."
      );
      return;
    }

    if (paisOrigen === paisDestino) {
      setMensajeError(
        "El país de origen y el país de destino deben ser diferentes."
      );
      return;
    }

    const productosValidos = productos.every(
      (producto) =>
        Number.isInteger(Number(producto.id)) &&
        Number(producto.id) > 0 &&
        Number.isInteger(Number(producto.cantidad)) &&
        Number(producto.cantidad) > 0 &&
        Number.isFinite(Number(producto.precio)) &&
        Number(producto.precio) > 0
    );

    if (!productosValidos) {
      setMensajeError(
        "Hay productos con cantidades o precios no válidos."
      );
      return;
    }

    setCalculando(true);

    try {
      const tokenAcceso =
        localStorage.getItem("token_acceso");

      if (!tokenAcceso) {
        router.replace("/iniciar-sesion");
        return;
      }

      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cuentas/landed-cost/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenAcceso}`,
          },
          body: JSON.stringify({
            productos,
            pais_origen: paisOrigen,
            pais_destino: paisDestino,
            metodo_transporte: metodoTransporte,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeError(
          datos.mensaje ||
          datos.detail ||
          "No fue posible calcular el Landed Cost."
        );
        return;
      }

      setResultado(datos);
    } catch (error) {
      console.error(
        "Error al calcular Landed Cost:",
        error
      );

      setMensajeError(
        "No fue posible conectar con el servidor."
      );
    } finally {
      setCalculando(false);
    }
  };

  // Esperar la verificación de sesión
  if (verificandoSesion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-purple-50">
        <p className="text-lg font-medium text-purple-700">
          Verificando sesión de ComGlo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-purple-50">
      <BarraNavegacion />

      <section className="mx-auto max-w-7xl px-6 py-12">

        {/* Encabezado */}
        <h1 className="text-4xl font-bold text-gray-900">
          Cálculo de Landed Cost
        </h1>

        <p className="mt-3 text-gray-600">
          Calcula el costo estimado de importar tus
          productos hasta el país de destino.
        </p>

        {/* Productos del carrito */}
        <section className="mt-8 rounded-xl border border-purple-100 bg-white p-7 shadow-md">

          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Productos a importar
            </h2>

            <button
              type="button"
              onClick={() => router.push("/carrito")}
              className="rounded-lg border border-purple-300 px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50"
            >
              Volver al carrito
            </button>
          </div>

          {productos.length === 0 ? (
            <p className="mt-5 text-gray-500">
              Tu carrito está vacío. Agrega productos
              antes de calcular los costos.
            </p>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-100 pb-4"
                  >

                    <div className="flex items-center gap-4">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          className="h-16 w-16 rounded-lg bg-purple-50 object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-purple-100 text-xs text-purple-700">
                          Sin imagen
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-gray-900">
                          {producto.nombre}
                        </p>

                        <p className="text-sm text-gray-500">
                          Cantidad: {producto.cantidad}
                        </p>

                        <p className="text-sm text-gray-500">
                          Origen:{" "}
                          {obtenerOrigenProducto(producto) ||
                            "No especificado"}
                        </p>
                      </div>
                    </div>

                    <p className="font-bold text-purple-700">
                      $
                      {formatearDinero(
                        Number(producto.precio) *
                          Number(producto.cantidad)
                      )}{" "}
                      USD
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap justify-between gap-4">
                <p className="text-gray-600">
                  Total de unidades:{" "}
                  <strong>{totalUnidades}</strong>
                </p>

                <p className="text-lg font-bold text-purple-700">
                  Subtotal: $
                  {formatearDinero(subtotalCarrito)} USD
                </p>
              </div>
            </>
          )}
        </section>

        {/* Datos y resultados */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">

          {/* Datos de importación */}
          <section className="rounded-xl border border-purple-100 bg-white p-7 shadow-md">

            <h2 className="text-2xl font-bold text-gray-900">
              Datos de importación
            </h2>

            {/* País de origen */}
            <div className="mt-6">
              <label
                htmlFor="paisOrigen"
                className="block font-semibold text-gray-700"
              >
                País de origen
              </label>

              <select
                id="paisOrigen"
                value={paisOrigen}
                disabled
                className="mt-2 w-full rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-gray-900"
              >
                <option value="">
                  {tieneVariosOrigenes
                    ? "Varios países de origen"
                    : "Origen no disponible"}
                </option>

                <option value="Estados Unidos">
                  Estados Unidos
                </option>

                <option value="China">
                  China
                </option>
              </select>

              <p className="mt-2 text-xs text-gray-500">
                El país de origen se identifica
                automáticamente a partir del carrito.
              </p>

              {tieneVariosOrigenes && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Tu carrito contiene productos de
                  distintos países. Para obtener un
                  cálculo correcto, debes calcular
                  cada origen por separado.
                </p>
              )}
            </div>

            {/* País de destino */}
            <div className="mt-5">
              <label
                htmlFor="paisDestino"
                className="block font-semibold text-gray-700"
              >
                País de destino
              </label>

              <select
                id="paisDestino"
                value={paisDestino}
                onChange={(evento) => {
                  setPaisDestino(evento.target.value);
                  setResultado(null);
                  setMensajeError("");
                }}
                className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
              >
                <option value="México">
                  México
                </option>

                <option value="Estados Unidos">
                  Estados Unidos
                </option>

                <option value="China">
                  China
                </option>
              </select>
            </div>

            {/* Método de transporte */}
            <div className="mt-5">
              <label
                htmlFor="metodoTransporte"
                className="block font-semibold text-gray-700"
              >
                Método de transporte
              </label>

              <select
                id="metodoTransporte"
                value={metodoTransporte}
                onChange={(evento) => {
                  setMetodoTransporte(evento.target.value);
                  setResultado(null);
                  setMensajeError("");
                }}
                className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
              >
                <option value="maritimo">
                  Transporte marítimo
                </option>

                <option value="aereo">
                  Transporte aéreo
                </option>

                <option value="terrestre">
                  Transporte terrestre
                </option>
              </select>
            </div>

            {/* Mensajes de error */}
            {mensajeError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
              >
                {mensajeError}
              </div>
            )}

            {/* Botón de cálculo */}
            <button
              type="button"
              onClick={solicitarLandedCost}
              disabled={
                calculando ||
                productos.length === 0 ||
                tieneVariosOrigenes ||
                tieneOrigenDesconocido ||
                !paisOrigen
              }
              className="mt-7 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {calculando
                ? "Calculando..."
                : "Calcular Landed Cost"}
            </button>
          </section>

          {/* Desglose estimado */}
          <section className="rounded-xl border border-purple-100 bg-white p-7 shadow-md">

            <h2 className="text-2xl font-bold text-gray-900">
              Desglose estimado
            </h2>

            {!resultado ? (
              <div className="mt-6 rounded-lg bg-purple-50 p-6 text-center text-gray-600">
                Selecciona los datos de importación y
                presiona "Calcular Landed Cost" para
                consultar el desglose estimado de tu compra.
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4 text-gray-700">

                  <div className="flex justify-between gap-4">
                    <span>Productos</span>
                    <span>
                      $
                      {formatearDinero(
                        resultado.subtotal_productos
                      )} USD
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>Transporte</span>
                    <span>
                      $
                      {formatearDinero(
                        resultado.transporte
                      )} USD
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>Aranceles</span>
                    <span>
                      $
                      {formatearDinero(
                        resultado.aranceles
                      )} USD
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>Impuestos</span>
                    <span>
                      $
                      {formatearDinero(
                        resultado.impuestos
                      )} USD
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span>Otros costos</span>
                    <span>
                      $
                      {formatearDinero(
                        resultado.otros_costos
                      )} USD
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-purple-200 pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xl font-bold text-gray-900">
                      Landed Cost total
                    </span>

                    <span className="text-3xl font-bold text-purple-700">
                      $
                      {formatearDinero(
                        resultado.costo_total
                      )} USD
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-purple-50 p-4 text-sm text-purple-900">
                  Este cálculo es una estimación.
                  El costo final dependerá de las tarifas,
                  clasificación arancelaria, impuestos
                  y condiciones de transporte.
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
