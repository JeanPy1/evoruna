import { emailLayout } from './layout'

// Plantilla HTML del correo de verificación con el enlace de activación.
export function verificationEmailHtml(email: string, link: string, ttlMinutes: number, siteUrl: string): string {
  return emailLayout({
    preheader: 'Último paso: confirma tu correo para activar tu cuenta.',
    icon: {
      glyph: '✓',
      circleBg: 'rgba(93,196,33,0.12)',
      circleBorder: 'rgba(93,196,33,0.40)',
      color: '#81DA4E'
    },
    title: 'Verifica tu correo',
    intro: `Recibimos tu registro en <strong style="color:#F4F6FB;">Evoruna</strong> con el correo <strong style="color:#F4F6FB;">${email}</strong>. Para activar tu cuenta, confirma que este es tu correo electrónico.`,
    buttonLabel: 'Verificar mi correo',
    buttonHref: link,
    note: `Este enlace expira en ${ttlMinutes} minutos. Si no creaste esta cuenta, ignora este mensaje.`,
    siteUrl
  })
}
