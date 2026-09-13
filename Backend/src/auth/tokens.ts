import { sign, verify } from 'hono/jwt'

const JWT_ALG = 'HS256'

// Propósito de cada token. Impide usar un token para un fin distinto al emitido.
export type TokenType = 'login' | 'verify-email' | 'reset-password'

// Vida útil de cada token, en segundos. Fuente única de verdad para JWT y BD.
export const TOKEN_TTL: Record<TokenType, number> = {
  login: 24 * 60 * 60, // 24 horas (sesión, stateless, en cookie)
  'verify-email': 30 * 60, // 30 minutos (stateful, en BD)
  'reset-password': 30 * 60 // 30 minutos (stateful, en BD)
}

// Contenido de cada token. `sub` es el id del usuario.
export type TokenClaims = {
  sub: string
  email: string
  type: TokenType
}

// Núcleo único de creación: firma el JWT añadiendo `iat` y `exp` según el tipo.
export async function createToken(
  env: CloudflareBindings,
  claims: TokenClaims
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { ...claims, iat: now, exp: now + TOKEN_TTL[claims.type] },
    env.JWT_SECRET,
    JWT_ALG
  )
}

// Núcleo único de decodificación: valida firma y expiración, y el tipo esperado
// cuando se indica. Lanza un error si el token es inválido o de otro propósito.
export async function decodeToken(
  token: string,
  env: CloudflareBindings,
  expectedType?: TokenType
): Promise<TokenClaims> {
  const payload = (await verify(token, env.JWT_SECRET, { alg: JWT_ALG })) as TokenClaims
  if (expectedType && payload.type !== expectedType) {
    throw new Error('El token no corresponde al propósito indicado')
  }
  return payload
}

// --- Fábricas por propósito: fijan tipo y vida útil para mayor legibilidad ---

// Sesión tras el login. Stateless, 24 h. Se envía en cookie y viaja en cada petición.
export function createLoginToken(
  env: CloudflareBindings,
  userId: number,
  email: string
): Promise<string> {
  return createToken(env, { sub: String(userId), email, type: 'login' })
}

// Verificación del correo al crear la cuenta. 30 min, se guarda hasheado en BD.
export function createEmailVerificationToken(
  env: CloudflareBindings,
  userId: number,
  email: string
): Promise<string> {
  return createToken(env, { sub: String(userId), email, type: 'verify-email' })
}

// Restablecimiento de contraseña. 30 min, se guarda hasheado en BD.
export function createPasswordResetToken(
  env: CloudflareBindings,
  userId: number,
  email: string
): Promise<string> {
  return createToken(env, { sub: String(userId), email, type: 'reset-password' })
}

// --- Persistencia de tokens stateful (verify-email y reset-password) ---

// Hash SHA-256 en hexadecimal para no guardar el token en claro.
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Guarda el token hasheado en BD (uno por correo y tipo), eliminando el anterior.
export async function storeToken(
  env: CloudflareBindings,
  type: TokenType,
  email: string,
  token: string
): Promise<void> {
  const tokenHash = await sha256Hex(token)
  await env.DB
    .prepare('DELETE FROM verification_tokens WHERE email = ? AND type = ?')
    .bind(email, type)
    .run()
  await env.DB
    .prepare(
      `INSERT INTO verification_tokens (email, token_hash, expires_at, type)
       VALUES (?, ?, datetime('now', '+' || ? || ' seconds'), ?)`
    )
    .bind(email, tokenHash, TOKEN_TTL[type], type)
    .run()
}

// Busca el token hasheado vigente para un correo y tipo. Devuelve el id o null.
export async function findStoredToken(
  env: CloudflareBindings,
  type: TokenType,
  email: string,
  token: string
): Promise<number | null> {
  const tokenHash = await sha256Hex(token)
  const stored = await env.DB
    .prepare(
      `SELECT id FROM verification_tokens
       WHERE email = ? AND type = ? AND token_hash = ? AND expires_at > datetime('now')`
    )
    .bind(email, type, tokenHash)
    .first<{ id: number }>()
  return stored?.id ?? null
}

// Elimina un token ya consumido.
export async function deleteToken(
  env: CloudflareBindings,
  tokenId: number
): Promise<void> {
  await env.DB.prepare('DELETE FROM verification_tokens WHERE id = ?').bind(tokenId).run()
}

// Enlace de activación que se incluye en el correo. Apunta a la página
// dedicada de verificación, que llama a la API y muestra el resultado.
export function buildVerificationLink(env: CloudflareBindings, token: string): string {
  return `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`
}

// Enlace de restablecimiento que se incluye en el correo. Apunta a la página
// de cambio de contraseña, que valida el token y muestra el formulario.
export function buildResetLink(env: CloudflareBindings, token: string): string {
  return `${env.APP_URL}/reset?token=${encodeURIComponent(token)}`
}

// Valida un token stateful completo: firma, tipo, expiración y hash guardado.
// Devuelve las claims si es válido o null en cualquier otro caso.
export async function validateStoredToken(
  env: CloudflareBindings,
  type: TokenType,
  token: string
): Promise<TokenClaims | null> {
  let payload: TokenClaims
  try {
    payload = await decodeToken(token, env, type)
  } catch {
    return null
  }
  const storedId = await findStoredToken(env, type, payload.email, token)
  if (storedId === null) return null
  return payload
}
