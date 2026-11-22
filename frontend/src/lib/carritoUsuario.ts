
interface UsuarioCarrito {
  id: number;
  tipo_cuenta: "comprador" | "vendedor";
}

// Obtener la clave exclusiva del carrito de cada comprador
export function obtenerClaveCarrito(): string {
  const usuarioGuardado = localStorage.getItem("usuario");

  if (!usuarioGuardado) {
    throw new Error("No existe una sesión de usuario.");
  }

  const usuario: UsuarioCarrito = JSON.parse(usuarioGuardado);

  if (
    usuario.tipo_cuenta !== "comprador" ||
    !Number.isInteger(usuario.id) ||
    usuario.id <= 0
  ) {
    throw new Error("El usuario no es un comprador válido.");
  }

  return `carrito_usuario_${usuario.id}`;
}
