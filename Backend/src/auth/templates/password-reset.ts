// Plantilla HTML del correo de restablecimiento de contraseña con enlace de cambio.
export function passwordResetEmailHtml(email: string, link: string, ttlMinutes: number): string {
  return `
  <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px 32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Restablece tu contraseña</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
        Hemos recibido una solicitud para cambiar la contraseña de la cuenta
        <strong>${email}</strong> en <strong>Evoruna</strong>. Haz clic en el botón para
        establecer una nueva contraseña.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">
          Cambiar contraseña
        </a>
      </div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
        Este enlace expira en ${ttlMinutes} minutos. Si no fuiste tú, ignora este mensaje:
        tu contraseña seguirá siendo la actual.
      </p>
    </div>
  </div>`
}
