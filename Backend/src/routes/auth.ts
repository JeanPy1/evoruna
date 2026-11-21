import { Hono, type Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { hashPassword, verifyPassword } from '../auth/password'
import {
  createLoginToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  decodeToken,
  buildResetLink,
  buildVerificationLink,
  storeToken,
  findStoredToken,
  validateStoredToken,
  deleteToken,
  TOKEN_TTL
} from '../auth/tokens'
import { sendPasswordResetEmail, sendVerificationEmail } from '../auth/email'
import { rateLimit } from '../auth/rate-limit'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Nombre de la cookie de sesión (HttpOnly).
const SESSION_COOKIE = 'evoruna_token'

// Hash fijo para igualar el tiempo de respuesta del login cuando el usuario
// no existe: evita que el tiempo de respuesta revele qué correos están dados
// de alta.
const DUMMY_BCRYPT_HASH =
  '$2b$10$e2BjeVpaMm3YDJsWHZAa.euCDf6TL8j6ASTVhjQlWKBnQcxilAzSK'

// Ventana de 15 minutos para el limitador de tasa.
const RATE_WINDOW_MS = 15 * 60 * 1000

// IP real del cliente tal y como la reporta Cloudflare.
function clientIp(c: Context): string {
  return c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
}

function tooManyRequests(c: Context) {
  return c.json(
    { error: 'Demasiados intentos. Vuelve a intentarlo en unos minutos.' },
    429
  )
}

type AuthEnv = { Bindings: CloudflareBindings }

export const auth = new Hono<AuthEnv>()

// Plan por defecto aplicado a todas las cuentas (aún no hay tabla de planes).
export const PLAN = { name: 'Pro', priceCents: 30000 }

// Validación de sesión compartida: devuelve la fila del usuario si la cookie
// contiene un token válido y la cuenta sigue vigente; si no, devuelve null.
// La usan /me y todas las rutas del dashboard.
export type Usuario = {
  id: number
  name: string
  email: string
  role: string
  password_hash: string
  created_at: string
}

export async function getSessionUser(c: Context<AuthEnv>): Promise<Usuario | null> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return null

  let payload
  try {
    payload = await decodeToken(token, c.env, 'login')
  } catch {
    return null
  }

  const user = await c.env.DB
    .prepare(
      'SELECT id, name, email, role, password_hash, suspended, created_at FROM users WHERE id = ?'
    )
    .bind(Number(payload.sub))
    .first<Usuario & { suspended: number }>()

  if (!user || user.suspended) return null
  return user
}

// POST /api/auth/register
// Crea la cuenta sin verificar y envía el correo de activación por Resend.
// No se emiten facturas ni planes: la cuenta empieza vacía y los datos
// aparecen cuando el usuario compra. Si Resend no envía, se revierte la
// cuenta (502).
auth.post('/register', async (c) => {
  if (!rateLimit(`register:${clientIp(c)}`, 5, RATE_WINDOW_MS)) {
    return tooManyRequests(c)
  }

  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim().toLowerCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!name || !email || !password) {
    return c.json({ error: 'Nombre, correo y contraseña son obligatorios' }, 400)
  }
  if (!EMAIL_RE.test(email)) {
    return c.json({ error: 'El correo electrónico no es válido' }, 400)
  }
  if (password.length < 4) {
    return c.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, 400)
  }

  const existing = await c.env.DB
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: number }>()

  if (existing) {
    return c.json({ error: 'El correo ya se encuentra registrado' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const result = await c.env.DB
    .prepare(
      'INSERT INTO users (name, email, password_hash, email_verified) VALUES (?, ?, ?, 0)'
    )
    .bind(name, email, passwordHash)
    .run()
  const userId = Number(result.meta.last_row_id)

  // Si Resend no envía el correo, se revierte la cuenta para no dejar una
  // sin enlace de activación.
  try {
    const token = await createEmailVerificationToken(c.env, userId, email)
    const link = buildVerificationLink(c.env, token)
    const sent = await sendVerificationEmail(c.env, email, link)
    if (!sent) {
      throw new Error('Resend no envió el correo de verificación')
    }
    await storeToken(c.env, 'verify-email', email, token)
  } catch {
    await c.env.DB
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run()
    return c.json(
      { error: 'No se pudo enviar el correo de verificación. Inténtalo de nuevo.' },
      502
    )
  }

  return c.json(
    { message: 'Cuenta creada. Revisa tu bandeja de entrada para completar la verificación.' },
    201
  )
})

// POST /api/auth/login
// Verifica credenciales y estado de la cuenta, y emite el token de sesión
// en una cookie httpOnly. Devuelve los datos mínimos del usuario para
// que el frontend decida la ruta de destino según su rol.
auth.post('/login', async (c) => {
  if (!rateLimit(`login:${clientIp(c)}`, 10, RATE_WINDOW_MS)) {
    return tooManyRequests(c)
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return c.json({ error: 'Correo y contraseña son obligatorios' }, 400)
  }

  const user = await c.env.DB
    .prepare(
      'SELECT id, name, email, password_hash, role, email_verified, suspended FROM users WHERE email = ?'
    )
    .bind(email)
    .first<{
      id: number
      name: string
      email: string
      password_hash: string
      role: string
      email_verified: number
      suspended: number
    }>()

  // La comparación bcrypt siempre se ejecuta (con un hash dummy si el usuario
  // no existe) para que el tiempo de respuesta no revele qué correos están
  // dados de alta.
  const valid = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, DUMMY_BCRYPT_HASH)

  if (!user || !valid) {
    return c.json({ error: 'Credenciales inválidas' }, 401)
  }
  if (user.suspended) {
    return c.json({ error: 'Tu cuenta está suspendida. Contacta con soporte.' }, 403)
  }
  if (!user.email_verified) {
    // El token anterior puede haber expirado (30 min) y dejar la cuenta sin
    // vía de activación: al intentar entrar se emite uno nuevo (storeToken
    // sustituye al anterior) y se reenvía el correo de verificación.
    try {
      const token = await createEmailVerificationToken(c.env, user.id, user.email)
      const link = buildVerificationLink(c.env, token)
      const sent = await sendVerificationEmail(c.env, user.email, link)
      if (!sent) {
        throw new Error('Resend no envió el correo de verificación')
      }
      await storeToken(c.env, 'verify-email', user.email, token)
    } catch {
      return c.json(
        {
          error:
            'Tu correo no está verificado y no se pudo reenviar el correo de verificación. Inténtalo de nuevo.',
        },
        502
      )
    }
    return c.json(
      {
        error:
          'Tu correo no está verificado. Te hemos enviado un nuevo correo de verificación. Revisa tu bandeja.',
      },
      403
    )
  }

  const token = await createLoginToken(c.env, user.id, user.email)

  // En desarrollo local (http) no se marca secure; en producción (https) sí.
  const secure = (c.env.APP_URL ?? '').startsWith('https')
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_TTL.login}${secure ? '; Secure' : ''}`
  )

  return c.json({ name: user.name, email: user.email, role: user.role })
})

// GET /api/auth/me
// Restaura la sesión: valida el token de la cookie, confirma que la cuenta
// sigue vigente y devuelve los datos mínimos del usuario.
auth.get('/me', async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: 'Sesión no iniciada o expirada' }, 401)
  }
  return c.json({ name: user.name, email: user.email, role: user.role })
})

// POST /api/auth/change-password
// Cambia la contraseña de la cuenta con sesión iniciada. Requiere la
// contraseña actual correcta y una nueva de al menos 4 caracteres.
auth.post('/change-password', async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: 'Sesión no iniciada o expirada' }, 401)
  }

  let body: { current?: unknown; new_password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const current = typeof body.current === 'string' ? body.current : ''
  const newPassword = typeof body.new_password === 'string' ? body.new_password : ''

  if (!current || !newPassword) {
    return c.json({ error: 'La contraseña actual y la nueva son obligatorias' }, 400)
  }
  if (newPassword.length < 4) {
    return c.json({ error: 'La contraseña nueva debe tener al menos 4 caracteres' }, 400)
  }

  const valid = await verifyPassword(current, user.password_hash)
  if (!valid) {
    return c.json({ error: 'La contraseña actual no es correcta' }, 400)
  }

  const passwordHash = await hashPassword(newPassword)
  await c.env.DB
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, user.id)
    .run()

  return c.json({ message: 'Contraseña actualizada correctamente' })
})

// POST /api/auth/logout
// Invalida la sesión. El token es stateless, por lo que basta con que el
// cliente descarte la cookie: se reemite con Max-Age=0.
auth.post('/logout', (c) => {
  const secure = (c.env.APP_URL ?? '').startsWith('https')
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
  )
  return c.json({ message: 'Sesión cerrada correctamente' })
})

// GET /api/auth/verify-email?token=...
// Endpoint polimórfico: valida firma y expiración del JWT, confirma el hash
// en BD y aplica el tipo que lleva el propio token:
//   - verify-email: activa la cuenta (email_verified = 1).
//   - change-email: cambia el correo de la cuenta al correo confirmado.
// Cualquier otro tipo (login, reset-password) responde 400.
auth.get('/verify-email', async (c) => {
  const token = c.req.query('token') ?? ''
  if (!token) {
    return c.json({ error: 'El token de verificación es obligatorio' }, 400)
  }

  let payload
  try {
    payload = await decodeToken(token, c.env)
  } catch {
    return c.json({ error: 'El enlace de verificación es inválido o ha expirado' }, 400)
  }
  if (payload.type !== 'verify-email' && payload.type !== 'change-email') {
    return c.json({ error: 'El enlace no corresponde a una verificación de correo' }, 400)
  }

  const storedId = await findStoredToken(c.env, payload.type, payload.email, token)
  if (storedId === null) {
    return c.json({ error: 'El enlace de verificación no es válido o ha expirado' }, 400)
  }

  const user = await c.env.DB
    .prepare('SELECT id, email, email_verified FROM users WHERE id = ?')
    .bind(Number(payload.sub))
    .first<{ id: number; email: string; email_verified: number }>()

  if (!user) {
    return c.json({ error: 'La cuenta no existe' }, 404)
  }

  // Cambio de correo: se aplica solo si el nuevo correo no está en uso.
  if (payload.type === 'change-email') {
    const conflict = await c.env.DB
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(payload.email, user.id)
      .first<{ id: number }>()

    await deleteToken(c.env, storedId)

    if (conflict) {
      return c.json({ error: 'Ese correo ya está registrado en otra cuenta' }, 409)
    }

    await c.env.DB
      .prepare('UPDATE users SET email = ? WHERE id = ?')
      .bind(payload.email, user.id)
      .run()

    return c.json({ message: 'Correo de tu cuenta actualizado correctamente' })
  }

  await deleteToken(c.env, storedId)

  if (!user.email_verified) {
    await c.env.DB
      .prepare('UPDATE users SET email_verified = 1 WHERE id = ?')
      .bind(user.id)
      .run()
  }

  return c.json({ message: 'Correo verificado correctamente' })
})

// POST /api/auth/forgot-password
// Con los mismos estados que /login: no existe, suspendido o pendiente de
// activación responden con su error. Si la cuenta está en orden, emite un
// token de restablecimiento y envía el correo con el enlace de cambio.
auth.post('/forgot-password', async (c) => {
  if (!rateLimit(`forgot:${clientIp(c)}`, 5, RATE_WINDOW_MS)) {
    return tooManyRequests(c)
  }

  let body: { email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) {
    return c.json({ error: 'El correo electrónico no es válido' }, 400)
  }

  const user = await c.env.DB
    .prepare('SELECT id, email_verified, suspended FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: number; email_verified: number; suspended: number }>()

  if (!user) {
    return c.json({ error: 'El usuario no existe' }, 404)
  }
  if (user.suspended) {
    return c.json({ error: 'Tu cuenta está suspendida. Contacta con soporte.' }, 403)
  }
  if (!user.email_verified) {
    return c.json(
      { error: 'Tu correo no está verificado. Revisa tu bandeja para completar la verificación.' },
      403
    )
  }

  try {
    const token = await createPasswordResetToken(c.env, user.id, email)
    const link = buildResetLink(c.env, token)
    const sent = await sendPasswordResetEmail(c.env, email, link)
    if (!sent) {
      throw new Error('Resend no envió el correo de restablecimiento')
    }
    await storeToken(c.env, 'reset-password', email, token)
  } catch {
    return c.json(
      { error: 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo.' },
      502
    )
  }

  return c.json({ message: 'Si el correo existe, se ha enviado un enlace de recuperación.' })
})

// GET /api/auth/validate-reset-token?token=...
// Prevalidación usada por la página /reset para decidir si muestra el
// formulario. No consume el token: puede validarse varias veces hasta usarse.
auth.get('/validate-reset-token', async (c) => {
  const token = c.req.query('token') ?? ''
  const payload = await validateStoredToken(c.env, 'reset-password', token)
  if (!payload) {
    return c.json({ error: 'El enlace de recuperación no es válido o ha expirado' }, 400)
  }
  return c.json({ valid: true })
})

// POST /api/auth/reset-password
// Con el token vigente y una contraseña nueva, actualiza el hash, consume el
// token y la sesión anterior queda obsoleta al cambiar la clave.
auth.post('/reset-password', async (c) => {
  let body: { token?: unknown; new_password?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const newPassword = typeof body.new_password === 'string' ? body.new_password : ''

  if (!token || !newPassword) {
    return c.json({ error: 'El token y la nueva contraseña son obligatorios' }, 400)
  }
  if (newPassword.length < 4) {
    return c.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, 400)
  }

  const payload = await validateStoredToken(c.env, 'reset-password', token)
  if (!payload) {
    return c.json({ error: 'El enlace de recuperación no es válido o ha expirado' }, 400)
  }

  const passwordHash = await hashPassword(newPassword)
  await c.env.DB
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, Number(payload.sub))
    .run()

  const storedId = await findStoredToken(c.env, 'reset-password', payload.email, token)
  if (storedId !== null) {
    await deleteToken(c.env, storedId)
  }

  return c.json({ message: 'Contraseña actualizada correctamente' })
})
