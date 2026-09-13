import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

// Genera el hash de una contraseña en texto plano.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

// Compara una contraseña en texto plano contra su hash guardado.
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
