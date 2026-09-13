import { Hono } from 'hono'
import { hashPassword, verifyPassword } from '../auth/password'
import {
  createEmailVerificationToken,
  createLoginToken,
  createPasswordResetToken,
  decodeToken,
  buildVerificationLink,
  buildResetLink,
  storeToken,
  findStoredToken,
  validateStoredToken,
  deleteToken,
  TOKEN_TTL
} from '../auth/tokens'
import { sendVerificationEmail, sendPasswordResetEmail } from '../auth/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthEnv = { Bindings: CloudflareBindings }

export const auth = new Hono<AuthEnv>()

// POST /api/auth/register
// Crea la cuenta en estado pendiente (email_verified = 0) y envía el enlace
// de verificación. Si el correo ya existe y está pendiente, reenvía el enlace.
auth.post('/register', async (c) => {
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
  if (password.length < 8) {
    return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
  }

  const existing = await c.env.DB
    .prepare('SELECT id, email_verified FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: number; email_verified: number }>()

  let userId: number
  let newlyCreated = false

  if (existing) {
    if (existing.email_verified) {
      return c.json({ error: 'El correo ya se encuentra registrado' }, 409)
    }
    userId = existing.id
  } else {
    const passwordHash = await hashPassword(password)
    const result = await c.env.DB
      .prepare(
        'INSERT INTO users (name, email, password_hash, email_verified) VALUES (?, ?, ?, 0)'
      )
      .bind(name, email, passwordHash)
      .run()
    userId = result.meta.last_row_id
    newlyCreated = true
  }

  try {
    const token = await createEmailVerificationToken(c.env, userId, email)
    const link = buildVerificationLink(c.env, token)
    const sent = await sendVerificationEmail(c.env, email, link)
    if (!sent) {
      throw new Error('Resend no envió el correo de verificación')
    }
    await storeToken(c.env, 'verify-email', email, token)
  } catch {
    if (newlyCreated) {
      await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()
    }
    return c.json(
      { error: 'No se pudo enviar el correo de verificación. Inténtalo de nuevo.' },
      502
    )
  }

  return c.json(
    { message: 'Cuenta creada correctamente. Revisa tu correo para verificarla.' },
    201
  )
})

// POST /api/auth/login
// Verifica credenciales y estado de la cuenta, y emite el token de sesión
// en una cookie httpOnly. Devuelve los datos mínimos del usuario para
// que el frontend decida la ruta de destino según su rol.
auth.post('/login', async (c) => {
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

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return c.json({ error: 'Contraseña incorrecta' }, 401)
  }

  const token = await createLoginToken(c.env, user.id, user.email)

  // En desarrollo local (http) no se marca secure; en producción (https) sí.
  const secure = (c.env.APP_URL ?? '').startsWith('https')
  c.header(
    'Set-Cookie',
    `evoruna_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TOKEN_TTL.login}${secure ? '; Secure' : ''}`
  )

  return c.json({ name: user.name, email: user.email, role: user.role })
})

// GET /api/auth/verify-email?token=...
// Valida firma y expiración del JWT, confirma el hash en BD y activa la cuenta.
auth.get('/verify-email', async (c) => {
  const token = c.req.query('token') ?? ''
  if (!token) {
    return c.json({ error: 'El token de verificación es obligatorio' }, 400)
  }

  let payload
  try {
    payload = await decodeToken(token, c.env, 'verify-email')
  } catch {
    return c.json({ error: 'El enlace de verificación es inválido o ha expirado' }, 400)
  }

  const storedId = await findStoredToken(c.env, 'verify-email', payload.email, token)
  if (storedId === null) {
    return c.json({ error: 'El enlace de verificación no es válido o ha expirado' }, 400)
  }

  const user = await c.env.DB
    .prepare('SELECT id, email_verified FROM users WHERE id = ?')
    .bind(Number(payload.sub))
    .first<{ id: number; email_verified: number }>()

  if (!user) {
    return c.json({ error: 'La cuenta no existe' }, 404)
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
  if (newPassword.length < 8) {
    return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
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
