
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

// Información recibida desde Django
interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_individual: number | string;
  precio_mayoreo: number | string;
  cantidad_minima_mayoreo: number;
  existencias: number;
  pais_origen: string;
  imagen_url: string | null;
  activo: boolean;
  categoria: string;
  nombre_categoria: string;
  nombre_vendedor: string;
}

// Producto almacenado en el carrito
interface ProductoCarrito extends Producto {
  cantidad: number;
  precio: number;
  origen: string;
  bandera: string;
}

export default function Catalogo() {
  const router = useRouter();

  const [verificandoSesion, setVerificandoSesion] =
    useState(true);

  const [cargandoProductos, setCargandoProductos] =
    useState(true);

  const [productos, setProductos] =
    useState<Producto[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");

  const productosFiltrados = productos.filter((producto) => {
    const coincideCategoria = categoriaSeleccionada === "todas" || producto.categoria === categoriaSeleccionada;
    const texto = busqueda.trim().toLocaleLowerCase("es");
    const coincideBusqueda = !texto || producto.nombre.toLocaleLowerCase("es").includes(texto) || producto.descripcion.toLocaleLowerCase("es").includes(texto);
    return coincideCategoria && coincideBusqueda;
  });

  const [errorProductos, setErrorProductos] =
    useState("");

  const [mensaje, setMensaje] =
    useState("");

  const [tipoComprador, setTipoComprador] =
    useState<"b2b" | "b2c">("b2c");

  // Producto seleccionado para ver detalles
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);

  const temporizadorMensaje =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // Obtener identificador del país
  const obtenerBandera = (pais: string): string => {
    const paisNormalizado = pais.toLowerCase();

    if (
      paisNormalizado === "china" ||
      paisNormalizado === "cn"
    ) {
      return "CN";
    }

    if (
      paisNormalizado === "estados unidos" ||
      paisNormalizado === "united states" ||
      paisNormalizado === "usa" ||
      paisNormalizado === "us"
    ) {
      return "US";
    }

    return "INT";
  };

  // Obtener precio según el tipo de comprador
  const obtenerPrecio = (producto: Producto): number => {
    return tipoComprador === "b2b"
      ? Number(producto.precio_mayoreo)
      : Number(producto.precio_individual);
  };

  // Mostrar mensajes al comprador
  const mostrarMensaje = (texto: string) => {
    setMensaje(texto);

    if (temporizadorMensaje.current) {
      clearTimeout(temporizadorMensaje.current);
    }

    temporizadorMensaje.current = setTimeout(() => {
      setMensaje("");
    }, 3000);
  };

  // Verificar sesión del comprador
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
      const usuario: Usuario =
        JSON.parse(usuarioGuardado);

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

      setTipoComprador(
        usuario.tipo_comprador === "b2b"
          ? "b2b"
          : "b2c"
      );

      setVerificandoSesion(false);
    } catch {
      localStorage.removeItem("usuario");
      router.replace("/iniciar-sesion");
    }
  }, [router]);

  // Consultar catálogo desde Django
  useEffect(() => {
    if (verificandoSesion) return;

    const controlador = new AbortController();

    const consultarProductos = async () => {
      setCargandoProductos(true);
      setErrorProductos("");

      try {
        const tokenAcceso =
          localStorage.getItem("token_acceso");

        const respuesta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/productos/catalogo/`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${tokenAcceso}`,
            },
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        if (respuesta.status === 401) {
          throw new Error(
            "Tu sesión expiró. Inicia sesión nuevamente."
          );
        }

        if (!respuesta.ok) {
          throw new Error(
            "No fue posible consultar los productos."
          );
        }

        const datos = await respuesta.json();

        const listaProductos = Array.isArray(datos)
          ? datos
          : datos.results;

        if (!Array.isArray(listaProductos)) {
          throw new Error(
            "El servidor devolvió un formato no reconocido."
          );
        }

        setProductos(
          listaProductos.filter(
            (producto: Producto) => producto.activo
          )
        );
      } catch (error) {
        if (controlador.signal.aborted) return;

        console.error(
          "Error al consultar productos:",
          error
        );

        setErrorProductos(
          error instanceof Error
            ? error.message
            : "No fue posible cargar el catálogo."
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoProductos(false);
        }
      }
    };

    consultarProductos();

    return () => controlador.abort();
  }, [verificandoSesion]);

  // Limpiar temporizador
  useEffect(() => {
    return () => {
      if (temporizadorMensaje.current) {
        clearTimeout(temporizadorMensaje.current);
      }
    };
  }, []);

  // Agregar producto al carrito individual
  const agregarAlCarrito = (producto: Producto) => {
    try {
      const claveCarrito = obtenerClaveCarrito();

      const carritoGuardado =
        localStorage.getItem(claveCarrito);

      let carrito: ProductoCarrito[] = [];

      try {
        const datos = carritoGuardado
          ? JSON.parse(carritoGuardado)
          : [];

        carrito = Array.isArray(datos) ? datos : [];
      } catch {
        carrito = [];
      }

      const existencias =
        Number(producto.existencias);

      if (
        !Number.isInteger(existencias) ||
        existencias <= 0
      ) {
        mostrarMensaje(
          "Este producto no tiene existencias disponibles."
        );
        return;
      }

      const cantidadMinima = Math.max(
        1,
        Number(producto.cantidad_minima_mayoreo)
      );

      const cantidadAgregar =
        tipoComprador === "b2b"
          ? cantidadMinima
          : 1;

      if (
        !Number.isInteger(cantidadAgregar) ||
        cantidadAgregar > existencias
      ) {
        mostrarMensaje(
          "No hay suficientes existencias para esta compra."
        );
        return;
      }

      const productoExistente = carrito.find(
        (elemento) => elemento.id === producto.id
      );

      const cantidadActual =
        Number(productoExistente?.cantidad ?? 0);

      const cantidadNueva =
        cantidadActual + cantidadAgregar;

      if (cantidadNueva > existencias) {
        mostrarMensaje(
          "No hay suficientes existencias disponibles."
        );
        return;
      }

      const precio = obtenerPrecio(producto);

      if (
        !Number.isFinite(precio) ||
        precio <= 0
      ) {
        mostrarMensaje(
          "El producto no tiene un precio válido."
        );
        return;
      }

      if (productoExistente) {
        carrito = carrito.map((elemento) =>
          elemento.id === producto.id
            ? {
                ...elemento,
                ...producto,
                cantidad: cantidadNueva,
                precio,
                origen: producto.pais_origen,
                bandera: obtenerBandera(
                  producto.pais_origen
                ),
              }
            : elemento
        );
      } else {
        carrito.push({
          ...producto,
          cantidad: cantidadAgregar,
          precio,
          origen: producto.pais_origen,
          bandera: obtenerBandera(
            producto.pais_origen
          ),
        });
      }

      localStorage.setItem(
        claveCarrito,
        JSON.stringify(carrito)
      );

      mostrarMensaje(
        `${producto.nombre} agregado al carrito.`
      );

      // Cerrar la ventana de detalles
      setProductoSeleccionado(null);
    } catch (error) {
      console.error(
        "Error al agregar producto:",
        error
      );

      mostrarMensaje(
        "No fue posible guardar el producto."
      );
    }
  };

  // Verificar disponibilidad para compra
  const puedeComprar = (producto: Producto) => {
    const existencias =
      Number(producto.existencias);

    const cantidadMinima = Math.max(
      1,
      Number(producto.cantidad_minima_mayoreo)
    );

    if (existencias <= 0) return false;

    if (
      tipoComprador === "b2b" &&
      existencias < cantidadMinima
    ) {
      return false;
    }

    return true;
  };

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
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Catálogo de productos
          </h1>

          <p className="mt-3 text-gray-600">
            Explora productos disponibles para
            comercio transfronterizo.
          </p>

          <div className="mt-5 inline-flex rounded-full border border-purple-200 bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
            {tipoComprador === "b2b"
              ? "Comprador empresarial B2B"
              : "Comprador personal B2C"}
          </div>

          {mensaje && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-purple-200 bg-purple-100 px-4 py-3 font-medium text-purple-800"
            >
              {mensaje}
            </div>
          )}
        </div>

        {/* Búsqueda y filtro de categorías */}
        <div className="mb-8 grid gap-4 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Buscar productos
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar laptop, celular, refrigerador..."
              className="rounded-lg border border-purple-200 px-4 py-3 font-normal outline-none focus:border-purple-500"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Categoría
            <select
              value={categoriaSeleccionada}
              onChange={(evento) => setCategoriaSeleccionada(evento.target.value)}
              className="rounded-lg border border-purple-200 bg-white px-4 py-3 font-normal outline-none focus:border-purple-500"
            >
              <option value="todas">Todas las categorías</option>
              <option value="computadoras">Computadoras</option>
              <option value="celulares">Celulares</option>
              <option value="linea_blanca">Línea blanca</option>
              <option value="electronica">Electrónica</option>
              <option value="hogar">Hogar</option>
              <option value="otros">Otros</option>
            </select>
          </label>
        </div>

        {/* Estado de carga */}
        {cargandoProductos && (
          <p className="text-center text-purple-700">
            Cargando productos de ComGlo...
          </p>
        )}

        {/* Error de consulta */}
        {errorProductos && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700"
          >
            {errorProductos}
          </div>
        )}

        {/* Catálogo */}
        {!cargandoProductos && !errorProductos && (
          <>
            {productos.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center shadow">
                <p className="text-gray-600">
                  Todavía no hay productos disponibles.
                </p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center text-gray-600 shadow">
                No se encontraron productos con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                {productosFiltrados.map((producto) => (
                  <article
                    key={producto.id}
                    className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >

                    {/* Imagen uniforme */}
                    <div className="flex h-52 items-center justify-center overflow-hidden bg-purple-50 p-5">
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-medium text-purple-500">
                          Sin imagen disponible
                        </span>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex flex-1 flex-col p-5">

                      {/* País */}
                      <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
                        {obtenerBandera(
                          producto.pais_origen
                        )}{" "}
                        {producto.pais_origen}
                      </p>

                      {/* Nombre limitado */}
                      <h2
                        title={producto.nombre}
                        className="mt-3 h-[4.5rem] overflow-hidden text-lg font-bold leading-6 text-gray-900"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 3,
                        }}
                      >
                        {producto.nombre}
                      </h2>

                      {/* Descripción limitada */}
                      <p
                        className="mt-2 h-10 overflow-hidden text-sm leading-5 text-gray-600"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {producto.descripcion}
                      </p>

                      {/* Categoría y vendedor */}
                      <p className="mt-3 text-xs font-semibold text-purple-700">
                        {producto.nombre_categoria || "Otros"}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        Vendido por: <strong className="text-purple-700">{producto.nombre_vendedor || "Vendedor no disponible"}</strong>
                      </p>

                      {/* Precio y acciones al fondo */}
                      <div className="mt-auto pt-5">

                        <p className="text-2xl font-bold text-purple-700">
                          $
                          {obtenerPrecio(
                            producto
                          ).toFixed(2)}{" "}
                          USD
                        </p>

                        {tipoComprador === "b2b" && (
                          <p className="mt-2 text-xs text-gray-500">
                            Mínimo de mayoreo:{" "}
                            {producto.cantidad_minima_mayoreo}{" "}
                            unidades
                          </p>
                        )}

                        <p className="mt-2 text-sm text-gray-500">
                          Existencias: {producto.existencias}
                        </p>

                        {/* Ver descripción completa */}
                        <button
                          type="button"
                          onClick={() =>
                            setProductoSeleccionado(
                              producto
                            )
                          }
                          className="mt-4 w-full rounded-lg border border-purple-300 px-4 py-2.5 font-semibold text-purple-700 transition hover:bg-purple-50"
                        >
                          Ver detalles
                        </button>

                        {/* Agregar al carrito */}
                        <button
                          type="button"
                          disabled={!puedeComprar(producto)}
                          onClick={() =>
                            agregarAlCarrito(producto)
                          }
                          className="mt-2 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          {Number(producto.existencias) <= 0
                            ? "Agotado"
                            : !puedeComprar(producto)
                              ? "Sin existencias para mayoreo"
                              : "Agregar al carrito"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Acceso al carrito */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="rounded-lg bg-purple-700 px-7 py-3 font-semibold text-white transition hover:bg-purple-800"
          >
            Ver carrito
          </button>
        </div>
      </section>

      {/* Ventana de detalles del producto */}
      {productoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() =>
            setProductoSeleccionado(null)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tituloDetalleProducto"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(evento) =>
              evento.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">
              <h2
                id="tituloDetalleProducto"
                className="text-2xl font-bold text-gray-900"
              >
                Detalles del producto
              </h2>

              <button
                type="button"
                onClick={() =>
                  setProductoSeleccionado(null)
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>

            {/* Imagen del producto */}
            <div className="mt-6 flex h-64 items-center justify-center rounded-xl bg-purple-50 p-5">
              {productoSeleccionado.imagen_url ? (
                <img
                  src={productoSeleccionado.imagen_url}
                  alt={productoSeleccionado.nombre}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="text-gray-500">
                  Sin imagen disponible
                </p>
              )}
            </div>

            <p className="mt-4 text-sm text-gray-600">
              Categoría: <strong>{productoSeleccionado.nombre_categoria || "Otros"}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Vendido por: <strong className="text-purple-700">{productoSeleccionado.nombre_vendedor || "Vendedor no disponible"}</strong>
            </p>

            {/* Información completa */}
            <h3 className="mt-6 text-xl font-bold text-gray-900">
              {productoSeleccionado.nombre}
            </h3>

            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
              {productoSeleccionado.descripcion}
            </p>

            <div className="mt-6 space-y-3 rounded-xl bg-purple-50 p-5">

              <p className="text-sm text-gray-700">
                <strong>País de origen:</strong>{" "}
                {productoSeleccionado.pais_origen}
              </p>

              <p className="text-sm text-gray-700">
                <strong>Existencias:</strong>{" "}
                {productoSeleccionado.existencias}
              </p>

              {tipoComprador === "b2b" && (
                <p className="text-sm text-gray-700">
                  <strong>Cantidad mínima:</strong>{" "}
                  {productoSeleccionado.cantidad_minima_mayoreo}{" "}
                  unidades
                </p>
              )}

              <p className="text-2xl font-bold text-purple-700">
                $
                {obtenerPrecio(
                  productoSeleccionado
                ).toFixed(2)}{" "}
                USD
              </p>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setProductoSeleccionado(null)
                }
                className="flex-1 rounded-lg border border-purple-300 px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50"
              >
                Volver al catálogo
              </button>

              <button
                type="button"
                disabled={
                  !puedeComprar(
                    productoSeleccionado
                  )
                }
                onClick={() =>
                  agregarAlCarrito(
                    productoSeleccionado
                  )
                }
                className="flex-1 rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}