// Módulo compartido de las pantallas de autenticación (login, register,
// forgot y reset). Centraliza los mensajes y la lógica de sesión para que
// cada página no duplique texto ni código.

// Clave del sessionStorage que indica que el usuario inició sesión.
export const SESSION_HINT = "evoruna_session_hint";

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

// Si existe una sesión reciente y válida, redirige a su panel en lugar de
// mostrar la pantalla de autenticación.
export async function redirectIfAuthenticated(apiUrl) {
  if (!sessionStorage.getItem(SESSION_HINT)) return false;

  try {
    const response = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });

    if (!response.ok) {
      sessionStorage.removeItem(SESSION_HINT);
      return false;
    }

    const user = await readJson(response);
    window.location.replace(homePathFor(user));
    return true;
  } catch {
    return false;
  }
}
