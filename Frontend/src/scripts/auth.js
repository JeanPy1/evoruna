// Módulo compartido de las pantallas de autenticación (login, register,
// forgot y reset). Centraliza los mensajes y la lógica de sesión para que
// cada página no duplique texto ni código.
//
// La sesión vive SOLO en la cookie httpOnly que emite el servidor; toda
// validación se hace contra el backend (GET /auth/me). No se guarda nada
// en sessionStorage.

// Registro único de mensajes. Cada aviso de la interfaz referencia una clave
// de este objeto; para cambiar un texto basta con editar su línea aquí.
export const MESSAGES = {
  // Validaciones locales del formulario
  network: { type: "error", text: "No se pudo conectar con el servidor. Inténtalo de nuevo." },
  incomplete: { type: "warning", text: "Completa todos los campos obligatorios." },
  mismatch: { type: "warning", text: "Las contraseñas no coinciden." },

  // Errores genéricos por operación (el detalle específico lo aporta el servidor)
  login_failed: { type: "error", text: "No se pudo iniciar sesión. Inténtalo de nuevo." },
  register_failed: { type: "error", text: "No se pudo crear la cuenta. Inténtalo de nuevo." },
  forgot_failed: { type: "error", text: "No se pudo enviar el enlace de recuperación. Inténtalo de nuevo." },
  reset_failed: { type: "error", text: "No se pudo actualizar la contraseña. Inténtalo de nuevo." },

  // Éxitos y avisos informativos
  recovery_sent: { type: "success", text: "Si el correo existe, se envió un enlace de recuperación." },
  email_sent: { type: "success", text: "Hemos enviado un correo de verificación. Revisa tu bandeja." },
  password_changed: { type: "success", text: "Contraseña actualizada. Ya puedes iniciar sesión." },
  invalid_token: { type: "warning", text: "El enlace de recuperación no es válido o ha expirado." },
};

// Ruta de destino según el rol del usuario.
export function homePathFor(user) {
  return user?.role === "admin" ? "/admin" : "/dashboard";
}

// Lee el cuerpo JSON de una respuesta sin lanzar errores.
export function readJson(response) {
  return response.json().catch(() => ({}));
}

// Cierra la sesión en el servidor (invalida la cookie) y redirige al login.
export async function logout(apiUrl) {
  try {
    await fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Aunque la petición falle se limpia la sesión local.
  }
  window.location.replace("/login");
}

// Guarda real para páginas protegidas: valida la sesión contra /auth/me.
// La cookie con el token es la única fuente de verdad: si el backend no
// confirma la sesión, se redirige a /login y devuelve null.
export async function requireSession(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });

    if (!response.ok) throw new Error("sesión inválida");

    return await readJson(response);
  } catch {
    window.location.replace("/login");
    return null;
  }
}

// Si el backend confirma una sesión válida, redirige a su panel en lugar de
// mostrar la pantalla de autenticación.
export async function redirectIfAuthenticated(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });

    if (!response.ok) return false;

    const user = await readJson(response);
    window.location.replace(homePathFor(user));
    return true;
  } catch {
    return false;
  }
}
