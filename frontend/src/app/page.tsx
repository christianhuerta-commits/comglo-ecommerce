
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BarraNavegacion from "@/componentes/BarraNavegacion";

const imagenes = [
  {
    ruta: "/comglo/comercio.jpg",
    titulo: "Conectamos mercados internacionales",
    descripcion: "Una nueva forma de comprar y vender entre fronteras.",
  },
  {
    ruta: "/comglo/logistica.jpg",
    titulo: "Comercio sin fronteras",
    descripcion: "Acercamos oportunidades comerciales a empresas y consumidores.",
  },
  {
    ruta: "/comglo/almacen.jpg",
    titulo: "Tu negocio, conectado con el mundo",
    descripcion: "Soluciones para compradores B2B y B2C.",
  },
];

export default function Inicio() {
  const [imagenActual, establecerImagenActual] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      establecerImagenActual((anterior) => (anterior + 1) % imagenes.length);
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  function cambiarImagen(direccion: number) {
    establecerImagenActual(
      (anterior) =>
        (anterior + direccion + imagenes.length) % imagenes.length
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <BarraNavegacion />

      {/* Carrusel principal */}
      <section className="relative h-[480px] overflow-hidden bg-slate-900">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${imagenActual * 100}%)`,
          }}
        >
          {imagenes.map((imagen) => (
            <div
              key={imagen.ruta}
              className="relative h-full w-full shrink-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(
              rgba(15, 23, 42, 0.10),
              rgba(15, 23, 42, 0.50)
              ), url('${imagen.ruta}')`,
              }}
            >
              <div className="flex h-full flex-col items-center justify-center px-12 text-center text-white">
                <h1 className="max-w-4xl text-4xl font-bold md:text-6xl">
                  {imagen.titulo}
                </h1>

                <p className="mt-6 max-w-2xl text-lg md:text-xl">
                  {imagen.descripcion}
                </p>

                <Link
                  href="/catalogo"
                  className="mt-8 rounded-lg bg-purple-600 px-7 py-3 font-semibold text-white transition hover:bg-purple-700"
                >
                  Explorar catálogo
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Flechas de navegación */}
        <button
          type="button"
          onClick={() => cambiarImagen(-1)}
          aria-label="Imagen anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-3 text-white hover:bg-black/60"
        >
          &#10094;
        </button>

        <button
          type="button"
          onClick={() => cambiarImagen(1)}
          aria-label="Imagen siguiente"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-4 py-3 text-white hover:bg-black/60"
        >
          &#10095;
        </button>

        {/* Indicadores */}
        <div className="absolute bottom-5 left-0 flex w-full justify-center gap-3">
          {imagenes.map((imagen, indice) => (
            <button
              key={imagen.ruta}
              type="button"
              onClick={() => establecerImagenActual(indice)}
              aria-label={`Ir a imagen ${indice + 1}`}
              className={`h-3 w-3 rounded-full ${
                imagenActual === indice ? "bg-purple-500" : "bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Nuestra razón de ser */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900">
          Nuestra razón de ser
        </h2>

        <p className="mt-8 text-lg leading-8 text-gray-600">
          En ComGlo creemos que las oportunidades comerciales no deben
          estar limitadas por las fronteras. Nuestra plataforma nace
          con el propósito de conectar compradores y vendedores,
          facilitando el comercio electrónico internacional entre
          Estados Unidos y China.
        </p>

        <p className="mt-5 text-lg leading-8 text-gray-600">
          Integramos soluciones para operaciones B2B, dirigidas a
          empresas y compradores mayoristas, y B2C, orientadas a
          consumidores individuales, ofreciendo una experiencia
          de compra accesible y organizada.
        </p>
      </section>

      {/* Misión y visión */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-purple-100 bg-purple-50 p-10 shadow-sm">
            <h2 className="text-3xl font-bold text-purple-800">
              Nuestra misión
            </h2>
            <p className="mt-5 leading-8 text-gray-700">
              Facilitar el comercio electrónico transfronterizo
              mediante una plataforma digital que conecte empresas,
              vendedores y consumidores, brindando herramientas
              para comprar, vender y estimar costos de importación.
            </p>
          </article>

          <article className="rounded-2xl border border-purple-100 bg-purple-50 p-10 shadow-sm">
            <h2 className="text-3xl font-bold text-purple-800">
              Nuestra visión
            </h2>
            <p className="mt-5 leading-8 text-gray-700">
              Convertirnos en una plataforma de referencia para
              el comercio digital internacional, promoviendo
              nuevas oportunidades de negocio mediante soluciones
              tecnológicas accesibles e innovadoras.
            </p>
          </article>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="bg-slate-900 px-6 py-8 text-center text-sm text-gray-300">
        © {new Date().getFullYear()} ComGlo.
        Plataforma de comercio electrónico transfronterizo B2B/B2C.
      </footer>
    </main>
  );
}
