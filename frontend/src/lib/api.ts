// Realizar peticiones autenticadas con renovación automática del token
export async function peticionAutenticada(
  direccion: string,
  opciones: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("token_acceso");

  const enviarPeticion = (tokenActual: string | null) => {
    const encabezados = new Headers(opciones.headers);

    if (tokenActual) {
      encabezados.set("Authorization", `Bearer ${tokenActual}`);
    }

    return fetch(direccion, {
      ...opciones,
      headers: encabezados,
    });
  };

  let respuesta = await enviarPeticion(token);

  // Renovar únicamente cuando el servidor rechace la autenticación
  if (respuesta.status !== 401) {
    return respuesta;
  }

  const tokenActualizacion = localStorage.getItem("token_actualizacion");

  if (!tokenActualizacion) {
    return respuesta;
  }

  const respuestaRenovacion = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/cuentas/renovar-token/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh: tokenActualizacion,
      }),
    }
  );

  if (!respuestaRenovacion.ok) {
    // El token de actualización ya no es válido
    localStorage.removeItem("token_acceso");
    localStorage.removeItem("token_actualizacion");
    return respuesta;
  }

  const datos = await respuestaRenovacion.json();

  localStorage.setItem("token_acceso", datos.access);

  // Repetir una sola vez la petición original
  respuesta = await enviarPeticion(datos.access);

  return respuesta;
}