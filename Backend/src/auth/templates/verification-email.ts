// Plantilla HTML del correo de verificación con el enlace de activación.
export function verificationEmailHtml(email: string, link: string, ttlMinutes: number): string {
  return `
  <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px 32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Verifica tu correo</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        Recibimos tu registro en <strong>Evoruna</strong> con el correo
        <strong>${email}</strong>. Haz clic en el botón para activar tu cuenta.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Verificar correo
        </a>
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        Este enlace expira en ${ttlMinutes} minutos. Si no fuiste tú, ignora este mensaje.
      </p>
    </div>
  </div>`
}
