// Base compartida de los correos transaccionales de Evoruna.
// Estructura por tablas con estilos 100% inline (máxima compatibilidad en
// Gmail, Outlook desktop/web y Apple Mail) y paleta navy/rojo de la marca.

export interface EmailIcon {
  glyph: string
  circleBg: string
  circleBorder: string
  color: string
}

export interface EmailLayoutOptions {
  // Texto oculto que aparece junto al asunto en el cliente de correo.
  preheader: string
  icon: EmailIcon
  title: string
  intro: string
  buttonLabel: string
  buttonHref: string
  note: string
  // URL pública del sitio (footer). Si es vacío, el footer no muestra enlace.
  siteUrl: string
}

const NAVY = '#0F1729' // hsl(222 47% 11%)
const CARD = '#172036' // navy-800 hsl(222 40% 15%)
const HAIRLINE = 'rgba(255,255,255,0.08)'
const WHITE = '#F4F6FB'
const TEXT = '#C3CDDD'
const MUTED = '#8A96AC'
const RED = '#EB1414' // electric hsl(0 84% 50%)
const RED_LIGHT = '#F53D3D' // electric-light hsl(0 90% 60%)

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export function emailLayout(o: EmailLayoutOptions): string {
  const domain = o.siteUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const footerSite = o.siteUrl
    ? `<a href="${o.siteUrl}" target="_blank" style="color:${MUTED};text-decoration:underline;">${domain}</a>`
    : domain
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${o.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${NAVY};">
  <!-- Preheader: texto de vista previa junto al asunto -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${NAVY};">
    ${o.preheader}
  </div>
  <div style="background-color:${NAVY};padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td>
                <!-- Tarjeta principal -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD};border:1px solid ${HAIRLINE};border-radius:16px;box-shadow:0 24px 80px -32px rgba(0,0,0,0.6);">
                  <!-- Línea de acento rojo -->
                  <tr>
                    <td height="3" style="height:3px;background-color:${RED};background-image:linear-gradient(90deg, rgba(235,20,20,0) 0%, ${RED} 22%, ${RED_LIGHT} 78%, rgba(245,61,61,0) 100%);"></td>
                  </tr>
                  <tr>
                    <td style="padding:40px 44px 44px;">
                      <!-- Marca -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="width:9px;height:9px;border-radius:2px;background-color:${RED};font-size:0;line-height:0;">&nbsp;</td>
                          <td style="padding-left:10px;font-size:13px;font-weight:800;letter-spacing:3px;color:${WHITE};font-family:${FONT};">EVORUNA</td>
                        </tr>
                      </table>
                      <!-- Icono circular -->
                      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 24px auto;">
                        <tr>
                          <td align="center" width="56" height="56" style="width:56px;height:56px;border-radius:28px;background-color:${o.icon.circleBg};border:1px solid ${o.icon.circleBorder};font-size:22px;line-height:54px;color:${o.icon.color};font-weight:700;">${o.icon.glyph}</td>
                        </tr>
                      </table>
                      <!-- Título -->
                      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;font-weight:800;color:${WHITE};text-align:center;font-family:${FONT};">${o.title}</h1>
                      <!-- Cuerpo -->
                      <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:${TEXT};text-align:center;font-family:${FONT};">${o.intro}</p>
                      <!-- Botón -->
                      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px auto;">
                        <tr>
                          <td align="center" bgcolor="${RED}" style="background-color:${RED};background-image:linear-gradient(135deg, ${RED} 0%, ${RED_LIGHT} 100%);border-radius:12px;">
                            <a href="${o.buttonHref}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:${FONT};">${o.buttonLabel}</a>
                          </td>
                        </tr>
                      </table>
                      <!-- Fallback del enlace -->
                      <p style="margin:0 0 20px;font-size:12px;line-height:1.7;color:${MUTED};text-align:center;font-family:${FONT};">
                        Si el botón no funciona, copia y pega esta URL en tu navegador:<br>
                        <a href="${o.buttonHref}" target="_blank" style="color:${MUTED};text-decoration:underline;word-break:break-all;">${o.buttonHref}</a>
                      </p>
                      <!-- Nota -->
                      <p style="margin:0;font-size:13px;line-height:1.7;color:${MUTED};text-align:center;font-family:${FONT};">${o.note}</p>
                    </td>
                  </tr>
                </table>
                <!-- Pie -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding:22px 8px 8px;">
                      <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};font-family:${FONT};">
                        © ${year} Evoruna · ${footerSite}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}
