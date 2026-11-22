
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import BarraNavegacion from "@/componentes/BarraNavegacion";
import { obtenerClaveCarrito } from "@/lib/carritoUsuario";

// Información del usuario autenticado
interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  tipo_cuenta: "comprador" | "vendedor";
  tipo_comprador?: "b2b" | "b2c";
}

// Productos guardados en el carrito
interface ProductoCarrito {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_individual?: number | string;
  precio_mayoreo?: number | string;
  cantidad_minima_mayoreo?: number;
  existencias?: number;
  origen: string;
  pais_origen?: string;
  bandera: string;
  imagen_url?: string | null;
  cantidad: number;
}

export default function Carrito() {
  const router = useRouter();

  const [productosCarrito, setProductosCarrito] =
    useState<ProductoCarrito[]>([]);

  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const [tipoComprador, setTipoComprador] =
    useState<"b2b" | "b2c">("b2c");

  // Obtener la cantidad mínima permitida
  const obtenerCantidadMinima = (
    producto: ProductoCarrito,
    modalidad: "b2b" | "b2c" = tipoComprador
  ) => {
    if (modalidad === "b2b") {
      return Math.max(
        1,
        Number(producto.cantidad_minima_mayoreo ?? 1)
      );
    }

    return 1;
  };

  // Obtener precio según el comprador
  const obtenerPrecio = (
    producto: ProductoCarrito,
    modalidad: "b2b" | "b2c" = tipoComprador
  ) => {
    const precio =
      modalidad === "b2b"
        ? producto.precio_mayoreo
        : producto.precio_individual;

    return Number(precio ?? producto.precio);
  };

  // Verificar sesión y recuperar el carrito exclusivo
  useEffect(() => {
    const tokenAcceso = localStorage.getItem("token_acceso");
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!tokenAcceso || !usuarioGuardado) {
      router.replace("/iniciar-sesion");
      return;
    }

    try {
      const usuario: Usuario = JSON.parse(usuarioGuardado);

      if (usuario.tipo_cuenta === "vendedor") {
        router.replace("/panel-vendedor");
        return;
      }

      if (
        usuario.tipo_cuenta !== "comprador" ||
        !Number.isInteger(usuario.id) ||
        usuario.id <= 0
      ) {
        router.replace("/iniciar-sesion");
        return;
      }

      const modalidad =
        usuario.tipo_comprador === "b2b" ? "b2b" : "b2c";

      setTipoComprador(modalidad);

      // Recuperar únicamente el carrito del comprador
      const claveCarrito = obtenerClaveCarrito();
      const carritoGuardado = localStorage.getItem(claveCarrito);

      if (carritoGuardado) {
        const datos = JSON.parse(carritoGuardado);

        if (Array.isArray(datos)) {
          const productosValidos: ProductoCarrito[] =
            datos.filter(
              (producto) =>
                producto &&
                Number.isInteger(producto.id) &&
                Number.isInteger(producto.cantidad) &&
                producto.cantidad > 0
            );

          setProductosCarrito(productosValidos);
        }
      }

      setCargando(false);
    } catch (error) {
      console.error("Error al recuperar el carrito:", error);
      setMensaje("No fue posible recuperar el carrito.");
      setCargando(false);
    }
  }, [router]);

  // Guardar los cambios en el carrito del comprador
  const guardarCarrito = (
    productos: ProductoCarrito[]
  ) => {
    try {
      const claveCarrito = obtenerClaveCarrito();

      localStorage.setItem(
        claveCarrito,
        JSON.stringify(productos)
      );

      setProductosCarrito(productos);
      setMensaje("");
    } catch (error) {
      console.error("Error al guardar el carrito:", error);
      setMensaje("No fue posible guardar los cambios.");
    }
  };

  // Modificar la cantidad de un producto
  const cambiarCantidad = (
    idProducto: number,
    nuevaCantidad: number
  ) => {
    const producto = productosCarrito.find(
      (elemento) => elemento.id === idProducto
    );

    if (!producto) return;

    const cantidadMinima =
      obtenerCantidadMinima(producto);

    const existencias = Number(
      producto.existencias ?? Number.MAX_SAFE_INTEGER
    );

    // No permitir cantidades decimales o inválidas
    if (
      !Number.isInteger(nuevaCantidad) ||
      nuevaCantidad < cantidadMinima
    ) {
      setMensaje(
        `La cantidad mínima permitida es ${cantidadMinima} unidades.`
      );
      return;
    }

    // No permitir cantidades superiores a las existencias
    if (nuevaCantidad > existencias) {
      setMensaje(
        `Solo hay ${existencias} unidades disponibles.`
      );
      return;
    }

    const productosActualizados =
      productosCarrito.map((elemento) =>
        elemento.id === idProducto
          ? {
              ...elemento,
              cantidad: nuevaCantidad,
            }
          : elemento
      );

    guardarCarrito(productosActualizados);
  };

  // Eliminar un producto del carrito
  const eliminarProducto = (idProducto: number) => {
    const productosActualizados =
      productosCarrito.filter(
        (producto) => producto.id !== idProducto
      );

    guardarCarrito(productosActualizados);
  };

  // Calcular subtotal con el precio correspondiente
  const subtotal = productosCarrito.reduce(
    (total, producto) =>
      total +
      obtenerPrecio(producto) * producto.cantidad,
    0
  );

  // Calcular número total de unidades
  const cantidadProductos = productosCarrito.reduce(
    (total, producto) =>
      total + producto.cantidad,
    0
  );

  // Formatear cantidades en dólares
  const formatoMoneda = (cantidad: number) =>
    cantidad.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Validar que el carrito cumpla las reglas de compra
  const carritoValido =
    productosCarrito.length > 0 &&
    productosCarrito.every((producto) => {
      const minimo = obtenerCantidadMinima(producto);
      const existencias = Number(
        producto.existencias ?? Number.MAX_SAFE_INTEGER
      );
      const precio = obtenerPrecio(producto);

      return (
        Number.isInteger(producto.cantidad) &&
        producto.cantidad >= minimo &&
        producto.cantidad <= existencias &&
        Number.isFinite(precio) &&
        precio > 0
      );
    });

  // Evitar mostrar información antes de verificar la sesión
  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-purple-50">
        <p className="text-lg font-medium text-purple-700">
          Verificando carrito de ComGlo...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-purple-50">
      <BarraNavegacion />

      <section className="mx-auto max-w-7xl px-6 py-12">

        {/* Encabezado */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Carrito de compras
          </h1>

          <p className="mt-3 text-gray-600">
            Revisa los productos antes de calcular
            el costo de importación.
          </p>

          <div className="mt-5 inline-flex rounded-full border border-purple-200 bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
            {tipoComprador === "b2b"
              ? "Comprador empresarial B2B"
              : "Comprador personal B2C"}
          </div>
        </div>

        {/* Mensajes de validación */}
        {mensaje && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-purple-200 bg-purple-100 px-4 py-3 text-purple-800"
          >
            {mensaje}
          </div>
        )}

        {productosCarrito.length === 0 ? (
          // Carrito vacío
          <div className="mt-10 rounded-2xl border border-purple-100 bg-white p-8 text-center shadow-md">

            <p className="text-lg text-gray-600">
              Tu carrito está vacío.
            </p>

            <Link
              href="/catalogo"
              className="mt-5 inline-block rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              Ir al catálogo
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-3">

            {/* Productos del carrito */}
            <div className="space-y-5 lg:col-span-2">

              {productosCarrito.map((producto) => (
                <article
                  key={producto.id}
                  className="flex flex-wrap items-center gap-5 rounded-2xl border border-purple-100 bg-white p-5 shadow-md"
                >

                  {/* Imagen real del producto */}
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-purple-100">
                    {producto.imagen_url ? (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-purple-500">
                        Sin imagen
                      </span>
                    )}
                  </div>

                  {/* Información */}
                  <div className="min-w-40 flex-1">
                    <h2 className="text-xl font-bold text-gray-900">
                      {producto.nombre}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Origen:{" "}
                      {producto.pais_origen ?? producto.origen}
                    </p>

                    <p className="mt-2 font-bold text-purple-700">
                      ${formatoMoneda(obtenerPrecio(producto))} USD
                    </p>

                    {tipoComprador === "b2b" && (
                      <p className="mt-1 text-xs text-gray-500">
                        Mínimo de mayoreo:{" "}
                        {obtenerCantidadMinima(producto)} unidades
                      </p>
                    )}

                    {producto.existencias !== undefined && (
                      <p className="mt-1 text-xs text-gray-500">
                        Existencias: {producto.existencias}
                      </p>
                    )}
                  </div>

                  {/* Cantidad y eliminación */}
                  <div>
                    <label
                      htmlFor={`cantidad-${producto.id}`}
                      className="block text-sm font-medium text-gray-600"
                    >
                      Cantidad
                    </label>

                    <input
                      id={`cantidad-${producto.id}`}
                      type="number"
                      min={obtenerCantidadMinima(producto)}
                      max={producto.existencias}
                      step="1"
                      value={producto.cantidad}
                      onChange={(evento) =>
                        cambiarCantidad(
                          producto.id,
                          Number(evento.target.value)
                        )
                      }
                      className="mt-1 w-24 rounded-lg border border-purple-200 px-3 py-2 text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        eliminarProducto(producto.id)
                      }
                      className="mt-2 block text-sm font-semibold text-red-600 transition hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Resumen de compra */}
            <aside className="h-fit rounded-2xl border border-purple-100 bg-white p-6 shadow-md">

              <h2 className="text-2xl font-bold text-gray-900">
                Resumen
              </h2>

              <div className="mt-6 flex justify-between text-gray-600">
                <span>Productos</span>
                <span>{cantidadProductos}</span>
              </div>

              <div className="mt-4 flex justify-between border-t border-purple-100 pt-4 text-xl font-bold text-gray-900">
                <span>Subtotal</span>

                <span className="text-purple-700">
                  ${formatoMoneda(subtotal)} USD
                </span>
              </div>

              <p className="mt-4 text-sm text-gray-500">
                El subtotal todavía no incluye transporte,
                impuestos, aranceles ni otros costos de importación.
              </p>

              {!carritoValido && (
                <p className="mt-4 text-sm font-medium text-red-600">
                  Revisa las cantidades, existencias y precios
                  antes de continuar.
                </p>
              )}

              {carritoValido ? (
                <Link
                  href="/costo-importacion"
                  className="mt-6 block rounded-lg bg-purple-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-purple-700"
                >
                  Calcular Landed Cost
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-lg bg-gray-400 px-4 py-3 font-semibold text-white"
                >
                  Calcular Landed Cost
                </button>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
