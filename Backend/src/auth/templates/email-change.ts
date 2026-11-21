import { emailLayout } from './layout'

// Plantilla HTML del correo de confirmación de cambio de correo (dashboard).
// Se envía al NUEVO correo para confirmar que el cambio es legítimo.
export function emailChangeHtml(currentEmail: string, newEmail: string, link: string, ttlMinutes: number, siteUrl: string): string {
  return emailLayout({
    preheader: 'Confirma que quieres cambiar el correo de tu cuenta.',
    icon: {
      glyph: '@',
      circleBg: 'rgba(34,211,238,0.12)',
      circleBorder: 'rgba(34,211,238,0.40)',
      color: '#22D3EE'
    },
    title: 'Confirma el cambio de correo',
    intro: `Alguien pidió cambiar el correo de la cuenta de <strong style="color:#F4F6FB;">Evoruna</strong> registrada con <strong style="color:#F4F6FB;">${currentEmail}</strong> a <strong style="color:#F4F6FB;">${newEmail}</strong>. Para aplicar el cambio, confirma que este es tu nuevo correo.`,
    buttonLabel: 'Confirmar nuevo correo',
    buttonHref: link,
    note: `Este enlace expira en ${ttlMinutes} minutos. Si no solicitaste este cambio, ignora este mensaje y tu correo seguirá siendo ${currentEmail}.`,
    siteUrl
  })
}
