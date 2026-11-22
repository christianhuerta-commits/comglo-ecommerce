
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BarraNavegacion from "@/componentes/BarraNavegacion";

// Información del vendedor
type Usuario = {
  nombre: string;
  tipo_cuenta: string;
  nombre_negocio?: string;
};

// Información para publicar un producto
type FormularioProducto = {
  nombre: string;
  categoria: string;
  descripcion: string;
  precio_individual: string;
  precio_mayoreo: string;
  cantidad_minima_mayoreo: string;
  existencias: string;
  pais_origen: string;
};

// Producto recibido desde Django
type ProductoVendedor = FormularioProducto & {
  id: number;
  activo: boolean;
  imagen_url?: string | null;
};

const categorias = [
  { valor: "computadoras", nombre: "Computadoras" },
  { valor: "celulares", nombre: "Celulares" },
  { valor: "linea_blanca", nombre: "Línea blanca" },
  { valor: "electronica", nombre: "Electrónica" },
  { valor: "hogar", nombre: "Hogar" },
  { valor: "otros", nombre: "Otros" },
];

// Valores iniciales del formulario
const formularioInicial: FormularioProducto = {
  nombre: "",
  categoria: "",
  descripcion: "",
  precio_individual: "",
  precio_mayoreo: "",
  cantidad_minima_mayoreo: "10",
  existencias: "",
  pais_origen: "China",
};

export default function PanelVendedor() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [formulario, setFormulario] =
    useState<FormularioProducto>(formularioInicial);

  // Estado de la administración de publicaciones
  const [productos, setProductos] = useState<ProductoVendedor[]>([]);
  const [mostrarProductos, setMostrarProductos] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [productoEditando, setProductoEditando] = useState<number | null>(null);
  const [formularioEdicion, setFormularioEdicion] = useState<FormularioProducto>(formularioInicial);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [procesandoProducto, setProcesandoProducto] = useState<number | null>(null);

  // Fotografía seleccionada y vista previa
  const [imagen, setImagen] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [claveImagen, setClaveImagen] = useState(0);

  const seleccionarImagen = (archivo: File | null) => {
    if (!archivo) {
      setImagen(null);
      setVistaPrevia(null);
      return;
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(archivo.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      setImagen(null);
      setVistaPrevia(null);
      setClaveImagen((anterior) => anterior + 1);
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setError("La fotografía no debe superar los 5 MB.");
      setImagen(null);
      setVistaPrevia(null);
      setClaveImagen((anterior) => anterior + 1);
      return;
    }

    setError("");
    setImagen(archivo);
    const lector = new FileReader();
    lector.onload = () => setVistaPrevia(String(lector.result));
    lector.readAsDataURL(archivo);
  };

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Comprobar que el usuario tenga una sesión de vendedor
  useEffect(() => {
    const datosUsuario = localStorage.getItem("usuario");
    const token = localStorage.getItem("token_acceso");

    if (!datosUsuario || !token) {
      router.replace("/iniciar-sesion");
      return;
    }

    try {
      const usuarioGuardado: Usuario = JSON.parse(datosUsuario);

      if (usuarioGuardado.tipo_cuenta !== "vendedor") {
        router.replace("/catalogo");
        return;
      }

      setUsuario(usuarioGuardado);
      setVerificando(false);
    } catch {
      router.replace("/iniciar-sesion");
    }
  }, [router]);

  // Actualizar los campos del formulario
  const actualizarCampo = (
    campo: keyof FormularioProducto,
    valor: string
  ) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // Obtener solamente los productos del vendedor autenticado
  const cargarProductos = async () => {
    const token = localStorage.getItem("token_acceso");
    if (!token) return;
    setCargandoProductos(true);
    setError("");
    try {
      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/productos/vendedor/`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
      const datos = await respuesta.json();
      const lista = Array.isArray(datos) ? datos : datos.results;
      if (!Array.isArray(lista)) throw new Error("Formato de respuesta inesperado");
      setProductos(lista);
    } catch (fallo) {
      console.error("Error al consultar productos:", fallo);
      setError("No fue posible consultar tus productos. Revisa Django y tu sesión.");
    } finally {
      setCargandoProductos(false);
    }
  };

  const comenzarEdicion = (producto: ProductoVendedor) => {
    setProductoEditando(producto.id);
    setFormularioEdicion({
      nombre: producto.nombre,
      categoria: producto.categoria || "otros",
      descripcion: producto.descripcion,
      precio_individual: String(producto.precio_individual),
      precio_mayoreo: String(producto.precio_mayoreo),
      cantidad_minima_mayoreo: String(producto.cantidad_minima_mayoreo),
      existencias: String(producto.existencias),
      pais_origen: producto.pais_origen,
    });
    setError("");
    setMensaje("");
  };

  const guardarEdicion = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (productoEditando === null) return;
    const datos = formularioEdicion;
    if (!datos.nombre.trim() || !datos.descripcion.trim() || !datos.categoria ||
        !Number.isFinite(Number(datos.precio_individual)) || Number(datos.precio_individual) <= 0 ||
        !Number.isFinite(Number(datos.precio_mayoreo)) || Number(datos.precio_mayoreo) <= 0 ||
        !Number.isInteger(Number(datos.cantidad_minima_mayoreo)) || Number(datos.cantidad_minima_mayoreo) < 1 ||
        !Number.isInteger(Number(datos.existencias)) || Number(datos.existencias) < 0) {
      setError("Revisa los campos: precios positivos, existencias válidas y categoría seleccionada.");
      return;
    }
    const token = localStorage.getItem("token_acceso");
    if (!token) return;
    setGuardandoEdicion(true);
    setError("");
    try {
      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/productos/vendedor/${productoEditando}/`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        }
      );
      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        throw new Error(detalle);
      }
      setMensaje("Producto actualizado correctamente.");
      setProductoEditando(null);
      await cargarProductos();
    } catch (fallo) {
      console.error("Error al editar producto:", fallo);
      setError("No se pudo guardar la edición. Verifica los datos y la conexión.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Retirar o volver a publicar sin borrar el registro
  const cambiarDisponibilidad = async (producto: ProductoVendedor) => {
    const accion = producto.activo ? "retirar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} el producto «${producto.nombre}»?`)) return;
    const token = localStorage.getItem("token_acceso");
    if (!token) return;
    setProcesandoProducto(producto.id);
    setError("");
    try {
      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/productos/vendedor/${producto.id}/`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: producto.nombre,
            categoria: producto.categoria,
            descripcion: producto.descripcion,
            precio_individual: producto.precio_individual,
            precio_mayoreo: producto.precio_mayoreo,
            cantidad_minima_mayoreo: producto.cantidad_minima_mayoreo,
            existencias: producto.existencias,
            pais_origen: producto.pais_origen,
            activo: !producto.activo,
          }),
        }
      );
      if (!respuesta.ok) throw new Error(await respuesta.text());
      setMensaje(producto.activo ? "Producto retirado del catálogo." : "Producto activado nuevamente.");
      await cargarProductos();
    } catch (fallo) {
      console.error("Error al cambiar disponibilidad:", fallo);
      setError("No se pudo cambiar la disponibilidad del producto.");
    } finally {
      setProcesandoProducto(null);
    }
  };

  // Enviar el producto al backend Django
  const publicarProducto = async (
    evento: FormEvent<HTMLFormElement>
  ) => {
    evento.preventDefault();

    setError("");
    setMensaje("");

    const precioIndividual = Number(formulario.precio_individual);
    const precioMayoreo = Number(formulario.precio_mayoreo);
    const cantidadMinima = Number(
      formulario.cantidad_minima_mayoreo
    );
    const existencias = Number(formulario.existencias);

    // Validaciones antes de enviar el producto
    if (
      !formulario.nombre.trim() ||
      !formulario.descripcion.trim()
    ) {
      setError("Completa el nombre y la descripción.");
      return;
    }

    if (
      !Number.isFinite(precioIndividual) ||
      !Number.isFinite(precioMayoreo) ||
      precioIndividual <= 0 ||
      precioMayoreo <= 0
    ) {
      setError("Los precios deben ser mayores que cero.");
      return;
    }

    if (
      !Number.isInteger(cantidadMinima) ||
      cantidadMinima < 1 ||
      !Number.isInteger(existencias) ||
      existencias < 0
    ) {
      setError(
        "Verifica la cantidad mínima y las existencias."
      );
      return;
    }

    if (!formulario.categoria) {
      setError("Selecciona una categoría para el producto.");
      return;
    }

    const token = localStorage.getItem("token_acceso");

    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }

    setGuardando(true);

    try {
      // Enviar texto y fotografía como formulario multipart
      const datosProducto = new FormData();
      datosProducto.append("nombre", formulario.nombre.trim());
      datosProducto.append("categoria", formulario.categoria);
      datosProducto.append("descripcion", formulario.descripcion.trim());
      datosProducto.append("precio_individual", formulario.precio_individual);
      datosProducto.append("precio_mayoreo", formulario.precio_mayoreo);
      datosProducto.append("cantidad_minima_mayoreo", String(cantidadMinima));
      datosProducto.append("existencias", String(existencias));
      datosProducto.append("pais_origen", formulario.pais_origen);
      datosProducto.append("activo", "true");

      if (imagen) {
        datosProducto.append("imagen", imagen);
      }

      const respuesta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/productos/vendedor/`,
        {
          method: "POST",
          headers: {
            // No establecer Content-Type: el navegador genera el límite multipart
            Authorization: `Bearer ${token}`,
          },
          body: datosProducto,
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          setError(
            "Tu sesión expiró. Cierra sesión e ingresa nuevamente."
          );
        } else if (respuesta.status === 403) {
          setError(
            "Tu cuenta no tiene permisos para publicar productos."
          );
        } else {
          const detalle = Object.values(datos)
            .flat()
            .join(" ");

          setError(
            detalle || "No fue posible publicar el producto."
          );
        }

        return;
      }

      setMensaje(
        `¡Producto "${formulario.nombre}" publicado correctamente!`
      );

      setFormulario({ ...formularioInicial });
      setImagen(null);
      setVistaPrevia(null);
      setClaveImagen((anterior) => anterior + 1);
      setMostrarFormulario(false);

    } catch (error) {
      console.error("Error al publicar el producto:", error);

      setError(
        "No se pudo conectar con Django. Verifica que el servidor esté encendido."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (verificando) {
    return (
      <main className="min-h-screen bg-purple-50">
        <div className="p-10 text-center text-purple-700">
          Verificando sesión...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-purple-50">
      <BarraNavegacion />

      <section className="mx-auto max-w-6xl px-6 py-10">

        {/* Encabezado del panel */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-500 p-8 text-white shadow-lg">

          <p className="text-sm font-medium text-purple-100">
            ComGlo Marketplace
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Panel del vendedor
          </h1>

          <p className="mt-3 text-purple-100">
            Bienvenido, {usuario?.nombre_negocio || usuario?.nombre}.
            Administra tus productos desde aquí.
          </p>
        </div>

        {/* Mensajes de publicación */}
        {mensaje && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 font-medium text-green-800"
          >
            {mensaje}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* Opciones de administración */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* Agregar productos */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-purple-800">
              Agregar productos
            </h2>

            <p className="mt-2 text-gray-600">
              Publica nuevos artículos para compradores
              empresariales y personales.
            </p>

            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(!mostrarFormulario);
                setError("");
              }}
              className="mt-5 w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              {mostrarFormulario
                ? "Cerrar formulario"
                : "+ Publicar nuevo producto"}
            </button>
          </div>

          {/* Administrar productos */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-purple-800">
              Administrar productos
            </h2>

            <p className="mt-2 text-gray-600">
              Modifica precios, existencias y disponibilidad
              de tus productos publicados.
            </p>

            <button
              type="button"
              onClick={() => {
                if (!mostrarProductos) void cargarProductos();
                setMostrarProductos(!mostrarProductos);
              }}
              className="mt-5 w-full rounded-lg bg-purple-100 px-4 py-3 text-sm font-semibold text-purple-800 hover:bg-purple-200"
            >
              {mostrarProductos ? "Ocultar mis productos" : "Ver y administrar mis productos"}
            </button>
          </div>

          {/* Precios B2B y B2C */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-purple-800">
              Precios B2B y B2C
            </h2>

            <p className="mt-2 text-gray-600">
              Configura precios individuales, precios de
              mayoreo y cantidades mínimas de compra.
            </p>
          </div>

          {/* Comercio internacional */}
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">

            <h2 className="text-xl font-bold text-purple-800">
              Comercio internacional
            </h2>

            <p className="mt-2 text-gray-600">
              Identifica el país de origen de tus productos
              para facilitar los cálculos de importación.
            </p>
          </div>
        </div>

        {/* Listado de productos del vendedor */}
        {mostrarProductos && (
          <section className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-purple-800">Mis productos publicados</h2>
              <button type="button" onClick={() => void cargarProductos()}
                className="rounded-lg border border-purple-300 px-4 py-2 text-purple-800 hover:bg-purple-50">
                Actualizar listado
              </button>
            </div>
            {cargandoProductos ? <p>Cargando productos...</p> : productos.length === 0 ? (
              <p className="text-gray-600">Todavía no tienes productos registrados.</p>
            ) : (
              <div className="space-y-4">
                {productos.map((producto) => (
                  <div key={producto.id} className="rounded-xl border border-purple-100 p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {producto.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={producto.imagen_url} alt={producto.nombre}
                          className="h-20 w-20 rounded-lg object-contain" />
                      ) : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-purple-50 text-xs text-gray-500">Sin imagen</div>}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
                        <p className="text-sm text-gray-600">{categorias.find((item) => item.valor === producto.categoria)?.nombre || "Otros"} · {producto.pais_origen}</p>
                        <p className="text-sm text-gray-700">B2C: ${producto.precio_individual} USD · B2B: ${producto.precio_mayoreo} USD</p>
                        <p className="text-sm text-gray-600">Existencias: {producto.existencias} · {producto.activo ? "Activo" : "Retirado"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => comenzarEdicion(producto)}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">Editar</button>
                        <button type="button" disabled={procesandoProducto === producto.id}
                          onClick={() => void cambiarDisponibilidad(producto)}
                          className="rounded-lg border border-purple-300 px-4 py-2 text-purple-800 hover:bg-purple-50 disabled:opacity-50">
                          {producto.activo ? "Retirar" : "Activar"}
                        </button>
                      </div>
                    </div>
                    {productoEditando === producto.id && (
                      <form onSubmit={guardarEdicion} className="mt-5 grid gap-4 border-t border-purple-100 pt-5 md:grid-cols-2">
                        {([
                          ["nombre", "Nombre del producto"],
                          ["precio_individual", "Precio B2C (USD)"],
                          ["precio_mayoreo", "Precio B2B (USD)"],
                          ["cantidad_minima_mayoreo", "Cantidad mínima de mayoreo"],
                          ["existencias", "Existencias"],
                        ] as [keyof FormularioProducto, string][]).map(([campo, etiqueta]) => (
                          <label key={campo} className="block text-sm font-medium text-gray-700">
                            {etiqueta}
                            <input required type={campo === "nombre" ? "text" : "number"}
                              min={campo === "existencias" ? "0" : campo === "nombre" ? undefined : campo.includes("precio") ? "0.01" : "1"}
                              step={campo.includes("precio") ? "0.01" : "1"}
                              value={formularioEdicion[campo]}
                              onChange={(evento) => setFormularioEdicion((anterior) => ({ ...anterior, [campo]: evento.target.value }))}
                              className="mt-1 w-full rounded-lg border border-purple-200 px-3 py-2 text-gray-900" />
                          </label>
                        ))}
                        <label className="block text-sm font-medium text-gray-700">Categoría
                          <select value={formularioEdicion.categoria} onChange={(evento) => setFormularioEdicion((anterior) => ({ ...anterior, categoria: evento.target.value }))}
                            className="mt-1 w-full rounded-lg border border-purple-200 px-3 py-2 text-gray-900">
                            {categorias.map((categoria) => <option key={categoria.valor} value={categoria.valor}>{categoria.nombre}</option>)}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-gray-700">País de origen
                          <select value={formularioEdicion.pais_origen} onChange={(evento) => setFormularioEdicion((anterior) => ({ ...anterior, pais_origen: evento.target.value }))}
                            className="mt-1 w-full rounded-lg border border-purple-200 px-3 py-2 text-gray-900">
                            <option value="China">China</option><option value="Estados Unidos">Estados Unidos</option>
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-gray-700 md:col-span-2">Descripción
                          <textarea required rows={3} value={formularioEdicion.descripcion}
                            onChange={(evento) => setFormularioEdicion((anterior) => ({ ...anterior, descripcion: evento.target.value }))}
                            className="mt-1 w-full rounded-lg border border-purple-200 px-3 py-2 text-gray-900" />
                        </label>
                        <div className="flex gap-3 md:col-span-2">
                          <button type="submit" disabled={guardandoEdicion}
                            className="rounded-lg bg-purple-700 px-5 py-2 font-semibold text-white disabled:opacity-50">
                            {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                          </button>
                          <button type="button" onClick={() => setProductoEditando(null)}
                            className="rounded-lg border border-gray-300 px-5 py-2 text-gray-700">Cancelar</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Formulario para publicar productos */}
        {mostrarFormulario && (
          <div className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-md md:p-8">

            <h2 className="text-2xl font-bold text-purple-800">
              Publicar nuevo producto
            </h2>

            <p className="mt-2 text-gray-600">
              Completa la información del producto que
              deseas ofrecer en ComGlo.
            </p>

            <form
              onSubmit={publicarProducto}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >

              {/* Nombre */}
              <div>
                <label
                  htmlFor="nombre"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Nombre del producto
                </label>

                <input
                  id="nombre"
                  type="text"
                  required
                  value={formulario.nombre}
                  onChange={(evento) =>
                    actualizarCampo("nombre", evento.target.value)
                  }
                  placeholder="Ej. Laptop profesional"
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Categoría del producto */}
              <div>
                <label
                  htmlFor="categoria"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Categoría del producto
                </label>
                <select
                  id="categoria"
                  required
                  value={formulario.categoria}
                  onChange={(evento) =>
                    actualizarCampo("categoria", evento.target.value)
                  }
                  className="w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  <option value="computadoras">Computadoras</option>
                  <option value="celulares">Celulares</option>
                  <option value="linea_blanca">Línea blanca</option>
                  <option value="electronica">Electrónica</option>
                  <option value="hogar">Hogar</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              {/* País de origen */}
              <div>
                <label
                  htmlFor="pais_origen"
                  className="mb-2 block font-medium text-gray-700"
                >
                  País de origen
                </label>

                <select
                  id="pais_origen"
                  value={formulario.pais_origen}
                  onChange={(evento) =>
                    actualizarCampo("pais_origen", evento.target.value)
                  }
                  className="w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                >
                  <option value="China">China</option>
                  <option value="Estados Unidos">
                    Estados Unidos
                  </option>
                </select>
              </div>

              {/* Descripción */}
              <div className="md:col-span-2">
                <label
                  htmlFor="descripcion"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Descripción
                </label>

                <textarea
                  id="descripcion"
                  required
                  rows={3}
                  value={formulario.descripcion}
                  onChange={(evento) =>
                    actualizarCampo(
                      "descripcion",
                      evento.target.value
                    )
                  }
                  placeholder="Describe las características del producto"
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Precio B2C */}
              <div>
                <label
                  htmlFor="precio_individual"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Precio individual B2C (USD)
                </label>

                <input
                  id="precio_individual"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={formulario.precio_individual}
                  onChange={(evento) =>
                    actualizarCampo(
                      "precio_individual",
                      evento.target.value
                    )
                  }
                  placeholder="899.00"
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Precio B2B */}
              <div>
                <label
                  htmlFor="precio_mayoreo"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Precio de mayoreo B2B (USD)
                </label>

                <input
                  id="precio_mayoreo"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={formulario.precio_mayoreo}
                  onChange={(evento) =>
                    actualizarCampo(
                      "precio_mayoreo",
                      evento.target.value
                    )
                  }
                  placeholder="799.00"
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Cantidad mínima de mayoreo */}
              <div>
                <label
                  htmlFor="cantidad_minima_mayoreo"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Cantidad mínima de mayoreo
                </label>

                <input
                  id="cantidad_minima_mayoreo"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={formulario.cantidad_minima_mayoreo}
                  onChange={(evento) =>
                    actualizarCampo(
                      "cantidad_minima_mayoreo",
                      evento.target.value
                    )
                  }
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Existencias */}
              <div>
                <label
                  htmlFor="existencias"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Existencias disponibles
                </label>

                <input
                  id="existencias"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={formulario.existencias}
                  onChange={(evento) =>
                    actualizarCampo(
                      "existencias",
                      evento.target.value
                    )
                  }
                  placeholder="50"
                  className="w-full rounded-lg border border-purple-200 px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Fotografía opcional del producto */}
              <div className="md:col-span-2">
                <label
                  htmlFor="imagen"
                  className="mb-2 block font-medium text-gray-700"
                >
                  Fotografía del producto (opcional)
                </label>
                <input
                  key={claveImagen}
                  id="imagen"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(evento) =>
                    seleccionarImagen(evento.target.files?.[0] || null)
                  }
                  className="w-full rounded-lg border border-purple-200 bg-white px-4 py-3 text-gray-900 focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Formatos JPG, PNG o WEBP. Máximo 5 MB.
                </p>
                {vistaPrevia && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-purple-800">
                      Vista previa
                    </p>
                    {/* La vista previa usa un archivo local seleccionado */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={vistaPrevia}
                      alt="Vista previa del producto"
                      className="h-48 w-48 rounded-xl border border-purple-200 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Botón de publicación */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? "Publicando producto..."
                    : "Guardar y publicar producto"}
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          ComGlo · Plataforma de comercio electrónico transfronterizo
        </p>
      </section>
    </main>
  );
}