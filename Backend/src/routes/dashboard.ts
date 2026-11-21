// ===========================================================================
//  Evoruna — Rutas del dashboard (área de cliente)
//  /api/dashboard            → todo el dato de una sola vez (resumen,
//                               tickets, facturas y actividad)
//  /api/dashboard/tickets    → crear ticket de soporte
//  /api/dashboard/invoices/:id/download → factura en PDF (generado en el
//                               propio Worker, sin librerías externas)
//
//  Todas las rutas requieren sesión válida (ver getSessionUser en auth.ts):
//  sin cookie válida la respuesta es 401 y el frontend redirige a /login.
// ===========================================================================
import { Hono, type Context } from 'hono'
import { getSessionUser, PLAN, EMAIL_RE } from './auth'
import {
  createEmailChangeToken,
  buildEmailChangeLink,
  storeToken
} from '../auth/tokens'
import { sendEmailChangeEmail } from '../auth/email'

type Env = { Bindings: CloudflareBindings }

export const dashboard = new Hono<Env>()

// ---------------------------------------------------------------------------
//  Utilidades de fecha y formato
// ---------------------------------------------------------------------------

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "2026-10-27 12:34:56" (UTC en BD) → "27 oct 2026"
function fechaCorta(isoUtc: string): string {
  const d = new Date(`${isoUtc}Z`)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MESES_CORTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Fecha de renovación del plan: día 1 del mes siguiente.
function proximaRenovacion(): string {
  const ahora = new Date()
  const proximo = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1))
  return `${String(proximo.getUTCDate()).padStart(2, '0')} ${MESES_CORTOS[proximo.getUTCMonth()]} ${proximo.getUTCFullYear()}`
}

function soles(cents: number): string {
  return `S/ ${(cents / 100).toFixed(2)}`
}

function ticketCode(id: number): string {
  return `TK-${String(id).padStart(4, '0')}`
}

// Fila de factura en formato que consume el frontend.
type FacturaFila = {
  id: number
  number: string
  period: string
  service: string
  amount_cents: number
  status: string
  issued_at: string
}

function mapInvoice(i: FacturaFila) {
  return {
    id: i.number,
    dbId: i.id,
    period: i.period,
    service: i.service,
    amount: i.amount_cents / 100,
    amountFormatted: soles(i.amount_cents),
    date: fechaCorta(i.issued_at),
    status: i.status
  }
}

// Número de factura secuencial por año: EV-2026-0001.
async function numeroFactura(db: D1Database): Promise<string> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM invoices').first<{ n: number }>()
  return `EV-${new Date().getUTCFullYear()}-${String((row?.n ?? 0) + 1).padStart(4, '0')}`
}

// Periodo de la factura: mes y año actuales ("Noviembre 2026").
function periodoActual(): string {
  const ahora = new Date()
  return `${MESES[ahora.getUTCMonth()]} ${ahora.getUTCFullYear()}`
}

// 401 estándar para cualquier ruta sin sesión.
function sinSesion(c: Context<Env>) {
  return c.json({ error: 'Sesión no iniciada o expirada' }, 401)
}

// ---------------------------------------------------------------------------
//  GET / → respuesta única con todo lo que muestra el área de cliente
// ---------------------------------------------------------------------------
dashboard.get('/', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  const tickets = await c.env.DB
    .prepare(
      'SELECT id, subject, category, status, created_at FROM tickets WHERE user_id = ? ORDER BY id DESC'
    )
    .bind(user.id)
    .all<{ id: number; subject: string; category: string; status: string; created_at: string }>()

  const invoices = await c.env.DB
    .prepare(
      'SELECT id, number, period, service, amount_cents, status, issued_at FROM invoices WHERE user_id = ? ORDER BY id DESC'
    )
    .bind(user.id)
    .all<{
      id: number
      number: string
      period: string
      service: string
      amount_cents: number
      status: string
      issued_at: string
    }>()

  // Actividad reciente: solo tickets y facturas reales, ordenada por fecha
  // (máximo 5). Una cuenta sin compras no muestra nada.
  const actividad = [
    ...tickets.results.map((t) => ({
      type: 'ticket',
      text: `Ticket ${ticketCode(t.id)} · ${t.subject.length > 42 ? `${t.subject.slice(0, 42)}…` : t.subject}`,
      iso: t.created_at
    })),
    ...invoices.results.map((i) => ({
      type: 'billing',
      text: `Factura ${i.number} emitida · ${i.period}`,
      iso: i.issued_at
    }))
  ]
    .sort((a, b) => b.iso.localeCompare(a.iso))
    .slice(0, 5)
    .map(({ type, text, iso }) => ({ type, text, time: fechaCorta(iso) }))

  return c.json({
    user: {
      name: user.name,
      email: user.email,
      memberSince: fechaCorta(user.created_at)
    },
    // El plan solo existe cuando hay al menos una factura PAGADA (compra
    // real completada). Facturas pendientes no activan el plan. Cuenta nueva
    // sin compras → null → el frontend muestra estado vacío.
    plan:
      invoices.results.some((i) => i.status === 'paid')
        ? {
            name: PLAN.name,
            priceFormatted: soles(PLAN.priceCents),
            renewal: proximaRenovacion()
          }
        : null,
    // Planes disponibles (único por ahora). El frontend los usa en el
    // panel de compra; el backend sigue siendo la fuente de precio/nombre.
    plans: [
      {
        name: PLAN.name,
        priceCents: PLAN.priceCents,
        priceFormatted: soles(PLAN.priceCents)
      }
    ],
    tickets: tickets.results.map((t) => ({
      id: ticketCode(t.id),
      subject: t.subject,
      category: t.category,
      createdAt: fechaCorta(t.created_at),
      status: t.status
    })),
    invoices: invoices.results.map(mapInvoice),
    activity: actividad
  })
})

// ---------------------------------------------------------------------------
//  POST /tickets → crea un ticket de soporte (estado inicial: abierto)
// ---------------------------------------------------------------------------
dashboard.post('/tickets', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  let body: { subject?: unknown; category?: unknown; priority?: unknown; description?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'Otro'
  const priority = typeof body.priority === 'string' && body.priority.trim() ? body.priority.trim() : 'Media'

  if (!subject || !description) {
    return c.json({ error: 'El asunto y la descripción son obligatorios' }, 400)
  }

  const result = await c.env.DB
    .prepare(
      'INSERT INTO tickets (user_id, subject, category, priority, description) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(user.id, subject, category, priority, description)
    .run()

  return c.json(
    {
      id: ticketCode(Number(result.meta.last_row_id)),
      subject,
      category,
      createdAt: 'hoy',
      status: 'open'
    },
    201
  )
})

// ---------------------------------------------------------------------------
//  PUT /profile → edita el perfil (nombre y/o correo).
//  - El nombre se actualiza de inmediato.
//  - El correo no se cambia a ciegas: se emite un token de confirmación
//    (tipo change-email) y se envía el enlace al NUEVO correo. El cambio
//    solo se aplica cuando el usuario confirma el enlace
//    (GET /api/auth/verify-email es polimórfico). Así una errata o una
//    sesión comprometida no dejan la cuenta sin acceso.
// ---------------------------------------------------------------------------
dashboard.put('/profile', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  let body: { name?: unknown; email?: unknown }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Cuerpo de petición inválido' }, 400)
  }

  const nombre = typeof body.name === 'string' ? body.name.trim() : null
  const correo = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null

  if (nombre === null && correo === null) {
    return c.json({ error: 'Indica el nombre o el correo a actualizar' }, 400)
  }
  if (nombre !== null && (nombre.length < 2 || nombre.length > 60)) {
    return c.json({ error: 'El nombre debe tener entre 2 y 60 caracteres' }, 400)
  }
  if (correo !== null && !EMAIL_RE.test(correo)) {
    return c.json({ error: 'El correo electrónico no es válido' }, 400)
  }

  // 1) Nombre: se aplica de inmediato (convención: minúsculas en BD).
  if (nombre !== null) {
    await c.env.DB
      .prepare('UPDATE users SET name = ? WHERE id = ?')
      .bind(nombre.toLowerCase(), user.id)
      .run()
  }

  // 2) Correo: flujo de confirmación al nuevo correo.
  if (correo !== null && correo !== user.email) {
    const ocupado = await c.env.DB
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(correo, user.id)
      .first<{ id: number }>()
    if (ocupado) {
      return c.json(
        { error: 'Ese correo ya está registrado en otra cuenta' },
        409
      )
    }

    const token = await createEmailChangeToken(c.env, user.id, correo)
    const link = buildEmailChangeLink(c.env, token)
    const enviado = await sendEmailChangeEmail(c.env, correo, user.email, link)
    if (!enviado) {
      return c.json(
        {
          error:
            'No se pudo enviar el correo de confirmación al nuevo correo. Reinténtalo.'
        },
        502
      )
    }
    // Sustituye cualquier solicitud de cambio anterior (por correo destino).
    await storeToken(c.env, 'change-email', correo, token)

    return c.json({
      name: nombre ?? user.name,
      email: user.email,
      pendingEmail: correo,
      message: `Te enviamos un enlace de confirmación a ${correo}. Tu correo cambiará cuando lo confirmes (30 minutos).`
    })
  }

  return c.json({
    name: nombre ?? user.name,
    email: user.email,
    pendingEmail: null,
    message: 'Perfil actualizado correctamente'
  })
})

// ---------------------------------------------------------------------------
//  POST /subscribe → compra del plan Pro (único plan por ahora).
//  Crea una factura PENDIENTE (la "compra"). Activar el plan requiere
//  pagarla: POST /invoices/:id/pay. Estados:
//   - 409: ya hay factura pagada (plan activo, no se duplica).
//   - 200: ya hay una factura pendiente → se devuelve la misma (idempotente).
//   - 201: compra creada.
//  Sin gateway de pago real: /pay simula el cobro. Para pagos online basta
//  con sustituir /pay por una sesión de pago (Stripe/Kushki) + webhook.
// ---------------------------------------------------------------------------
dashboard.post('/subscribe', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  const pagada = await c.env.DB
    .prepare('SELECT id FROM invoices WHERE user_id = ? AND status = ?')
    .bind(user.id, 'paid')
    .first<{ id: number }>()
  if (pagada) {
    return c.json(
      { error: `Ya tienes el plan ${PLAN.name} activo. No necesitas comprar de nuevo.` },
      409
    )
  }

  const pendiente = await c.env.DB
    .prepare(
      'SELECT id, number, period, service, amount_cents, status, issued_at FROM invoices WHERE user_id = ? AND status = ? ORDER BY id DESC'
    )
    .bind(user.id, 'pending')
    .first<FacturaFila>()
  if (pendiente) {
    return c.json({
      invoice: mapInvoice(pendiente),
      message: 'Ya tienes una compra pendiente. Completa el pago para activar tu plan.'
    })
  }

  const result = await c.env.DB
    .prepare(
      'INSERT INTO invoices (user_id, number, period, service, amount_cents, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(
      user.id,
      await numeroFactura(c.env.DB),
      periodoActual(),
      `Plan ${PLAN.name} — Evoruna`,
      PLAN.priceCents,
      'pending'
    )
    .run()

  const nueva = await c.env.DB
    .prepare(
      'SELECT id, number, period, service, amount_cents, status, issued_at FROM invoices WHERE id = ?'
    )
    .bind(Number(result.meta.last_row_id))
    .first<FacturaFila>()

  if (!nueva) {
    return c.json({ error: 'No se pudo crear la compra. Reinténtalo.' }, 500)
  }

  return c.json(
    {
      invoice: mapInvoice(nueva),
      message: 'Compra creada. Completa el pago para activar tu plan.'
    },
    201
  )
})

// ---------------------------------------------------------------------------
//  POST /invoices/:id/pay → marca una factura pendiente como pagada
//  (simulación de cobro: aún no hay gateway de pago). Solo facturas propias.
//  Con pagos online esta ruta se sustituye por la creación de una sesión de
//  pago y el webhook que confirma el cobro.
// ---------------------------------------------------------------------------
dashboard.post('/invoices/:id/pay', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  const id = Number(c.req.param('id'))
  const invoice = await c.env.DB
    .prepare(
      'SELECT id, number, period, service, amount_cents, status, issued_at FROM invoices WHERE id = ? AND user_id = ?'
    )
    .bind(id, user.id)
    .first<FacturaFila>()

  if (!invoice) {
    return c.json({ error: 'La factura no existe' }, 404)
  }
  if (invoice.status === 'paid') {
    return c.json({ error: 'La factura ya está pagada' }, 409)
  }

  await c.env.DB
    .prepare("UPDATE invoices SET status = 'paid' WHERE id = ?")
    .bind(invoice.id)
    .run()

  return c.json({
    invoice: { ...mapInvoice(invoice), status: 'paid' },
    message: 'Pago registrado. Tu plan está activo.'
  })
})

// ---------------------------------------------------------------------------
//  GET /invoices/:id/download → factura en PDF (solo su propia)
// ---------------------------------------------------------------------------
dashboard.get('/invoices/:id/download', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return sinSesion(c)

  const id = Number(c.req.param('id'))
  const invoice = await c.env.DB
    .prepare(
      'SELECT number, period, service, amount_cents, status, issued_at FROM invoices WHERE id = ? AND user_id = ?'
    )
    .bind(id, user.id)
    .first<{
      number: string
      period: string
      service: string
      amount_cents: number
      status: string
      issued_at: string
    }>()

  if (!invoice) {
    return c.json({ error: 'La factura no existe' }, 404)
  }

  const pdf = facturaPdf(invoice, user.name, user.email)
  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${invoice.number}.pdf"`
    }
  })
})

// ---------------------------------------------------------------------------
//  Generador de PDF mínimo (1 página, Helvetica, sin dependencias).
//  El texto se sanitiza a ASCII para que los offsets del xref sean exactos.
// ---------------------------------------------------------------------------

function ascii(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
}

function pdfEsc(text: string): string {
  return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

// Ancho aproximado del texto en Helvetica (para alinear montos a la derecha).
function anchoTexto(text: string, size: number): number {
  return text.length * size * 0.55
}

type LineaPdf = {
  text: string
  x: number
  y: number
  font: 'F1' | 'F2'
  size: number
  right?: boolean
}

function facturaPdf(
  invoice: {
    number: string
    period: string
    service: string
    amount_cents: number
    status: string
    issued_at: string
  },
  cliente: string,
  email: string
): Uint8Array {
  const IZQ = 54
  const DER = 558
  const total = (invoice.amount_cents / 100).toFixed(2)

  const lineas: LineaPdf[] = [
    { text: 'EVORUNA', x: IZQ, y: 742, font: 'F2', size: 20 },
    { text: 'Factura', x: IZQ, y: 714, font: 'F1', size: 11 },
    { text: invoice.number, x: DER, y: 742, font: 'F2', size: 14, right: true },
    { text: `Periodo: ${invoice.period}`, x: DER, y: 720, font: 'F1', size: 9, right: true },
    { text: `Fecha: ${fechaCorta(invoice.issued_at)}`, x: DER, y: 704, font: 'F1', size: 9, right: true },
    { text: 'Cliente', x: IZQ, y: 664, font: 'F2', size: 11 },
    { text: cliente, x: IZQ, y: 646, font: 'F1', size: 10 },
    { text: email, x: IZQ, y: 630, font: 'F1', size: 10 },
    { text: 'Servicio', x: IZQ, y: 586, font: 'F2', size: 10 },
    { text: 'Importe', x: DER, y: 586, font: 'F2', size: 10, right: true },
    { text: invoice.service, x: IZQ, y: 566, font: 'F1', size: 10 },
    { text: `S/ ${total}`, x: DER, y: 566, font: 'F1', size: 10, right: true },
    { text: 'Total', x: IZQ, y: 522, font: 'F2', size: 12 },
    { text: `S/ ${total}`, x: DER, y: 522, font: 'F2', size: 12, right: true },
    {
      text: `Estado: ${invoice.status === 'paid' ? 'Pagada' : 'Pendiente de pago'}`,
      x: IZQ,
      y: 478,
      font: 'F1',
      size: 10
    },
    { text: 'Evoruna — Sitios web que evolucionan contigo', x: IZQ, y: 70, font: 'F1', size: 9 }
  ]

  const contenido =
    'BT\n' +
    lineas
      .map((l) => {
        const x = l.right ? Math.round(DER - anchoTexto(l.text, l.size)) : l.x
        return `1 0 0 1 ${x} ${l.y} Tm /${l.font} ${l.size} Tf (${pdfEsc(l.text)}) Tj`
      })
      .join('\n') +
    '\nET'

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objetos.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })

  const xrefPos = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`

  return new TextEncoder().encode(pdf)
}
