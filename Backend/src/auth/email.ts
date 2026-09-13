import { TOKEN_TTL } from './tokens'
import { verificationEmailHtml } from './templates/verification-email'
import { passwordResetEmailHtml } from './templates/password-reset'

const VERIFICATION_EMAIL_TTL_MINUTES = TOKEN_TTL['verify-email'] / 60
const RESET_EMAIL_TTL_MINUTES = TOKEN_TTL['reset-password'] / 60

// Envío genérico a través de la API de Resend.
// Devuelve true si Resend aceptó el envío y false en caso contrario.
async function sendEmail(
  env: CloudflareBindings,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to,
      subject,
      html
    })
  })
  return response.ok
}

// Envía el correo de verificación.
export function sendVerificationEmail(
  env: CloudflareBindings,
  to: string,
  link: string
): Promise<boolean> {
  return sendEmail(
    env,
    to,
    'Verifica tu correo - Evoruna',
    verificationEmailHtml(to, link, VERIFICATION_EMAIL_TTL_MINUTES)
  )
}

// Envía el correo de restablecimiento de contraseña.
export function sendPasswordResetEmail(
  env: CloudflareBindings,
  to: string,
  link: string
): Promise<boolean> {
  return sendEmail(
    env,
    to,
    'Restablece tu contraseña - Evoruna',
    passwordResetEmailHtml(to, link, RESET_EMAIL_TTL_MINUTES)
  )
}
