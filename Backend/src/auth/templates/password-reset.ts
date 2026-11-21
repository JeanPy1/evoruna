import { emailLayout } from './layout'

// Plantilla HTML del correo de restablecimiento de contraseña con enlace de cambio.
export function passwordResetEmailHtml(email: string, link: string, ttlMinutes: number, siteUrl: string): string {
  return emailLayout({
    preheader: 'Alguien solicitó cambiar la contraseña de tu cuenta.',
    icon: {
      glyph: '🔒',
      circleBg: 'rgba(235,20,20,0.12)',
      circleBorder: 'rgba(235,20,20,0.40)',
      color: '#F53D3D'
    },
    title: 'Restablece tu contraseña',
    intro: `Recibimos una solicitud para cambiar la contraseña de tu cuenta <strong style="color:#F4F6FB;">${email}</strong> en <strong style="color:#F4F6FB;">Evoruna</strong>. Usa el botón para elegir una nueva contraseña.`,
    buttonLabel: 'Cambiar mi contraseña',
    buttonHref: link,
    note: `Este enlace expira en ${ttlMinutes} minutos. Si no solicitaste este cambio, ignora este mensaje: tu contraseña seguirá intacta.`,
    siteUrl
  })
}
