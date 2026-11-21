// ============================================================
//  Evoruna — Área de cliente (dashboard).
//  Guard de sesión (valida contra /auth/me), sidebar mobile, cierre de
//  sesión contra el backend, y carga real de datos desde /api/dashboard
//  (resumen, tickets, facturas con PDF y cambio de contraseña).
// ============================================================
import { requireSession, logout } from "./auth.js";

// Base de la API: misma origen por defecto (Worker unificado de Cloudflare).
const API_URL = import.meta.env.PUBLIC_API_URL ?? "/api";

// ----------------------------------------------------------------
//  Utilidades de formato
// ----------------------------------------------------------------

// Formatea "carlos mendoza" (guardado en minúsculas) a "Carlos Mendoza".
function prettyName(name) {
  return name.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

// 30000 (cents) → "S/ 300.00"
function money(cents) {
  return `S/ ${(cents / 100).toFixed(2)}`;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Día 1 del mes siguiente (coincide con la renovación del plan).
function proximoCobro() {
  const ahora = new Date();
  const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1));
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES_CORTOS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Chips de estado (mismos estilos que StatusBadge.astro).
const ESTADO_TICKET = {
  open: { texto: "Abierto", clase: "border-electric/25 bg-electric/10 text-electric-light" },
  progress: { texto: "En progreso", clase: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  resolved: { texto: "Resuelto", clase: "border-neon/25 bg-neon/10 text-neon-light" },
};
const ESTADO_FACTURA = {
  paid: { texto: "Pagada", clase: "border-neon/25 bg-neon/10 text-neon-light" },
  pending: { texto: "Pendiente", clase: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
};

function chipEstado(estado) {
  const e = estado.clase;
  return `<span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold ${e}">
    <span class="size-1.5 rounded-full bg-current"></span>${estado.texto}</span>`;
}

// Fila de estado vacío para listas sin datos (tickets, facturas, actividad).
function emptyRow(texto) {
  const li = document.createElement("li");
  li.className = "px-5 py-6 text-sm text-slate-500";
  li.textContent = texto;
  return li;
}

// Íconos (estilo lucide, stroke) para la lista de actividad.
const ICONOS_ACTIVIDAD = {
  ticket: `<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/></svg>`,
  billing: `<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>`,
  security: `<svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

const TONOS_ACTIVIDAD = {
  ticket: "border-white/10 bg-white/5 text-slate-300",
  billing: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  security: "border-neon/20 bg-neon/10 text-neon-light",
};

// ----------------------------------------------------------------
//  Carga de datos
// ----------------------------------------------------------------

// Devuelve todo el dato del dashboard o redirige a /login si no hay sesión.
async function cargarDashboard() {
  const res = await fetch(`${API_URL}/dashboard`, { credentials: "same-origin" });
  if (res.status === 401) {
    location.href = "/login";
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

// ----------------------------------------------------------------
//  Render por sección
// ----------------------------------------------------------------

function setText(selector, texto) {
  document.querySelectorAll(selector).forEach((el) => (el.textContent = texto));
}

// Resumen: stats, plan y última factura.
function renderResumen(d) {
  const ultima = d.invoices[0];
  const plan = d.plan; // null si el usuario aún no ha comprado nada
  const abiertos = d.tickets.filter((t) => t.status === "open").length;
  const activos = d.tickets.filter((t) => t.status === "open" || t.status === "progress").length;

  setText("[data-value='stat-site']", plan ? "Activo" : "Sin sitio");
  setText("[data-sub='stat-site-sub']", plan ? "Uptime 99,98%" : "Sin producto aún");
  setText("[data-value='stat-plan']", plan ? plan.name : "Sin plan");
  setText("[data-sub='stat-plan-renewal']", plan ? `${plan.priceFormatted}/mes · renueva ${plan.renewal}` : "Sin suscripción activa");
  setText("[data-value='stat-tickets']", `${activos} activos`);
  setText("[data-sub='stat-tickets-sub']", abiertos === 1 ? "1 abierto" : `${abiertos} abiertos`);
  setText("[data-value='stat-invoices']", String(d.invoices.length));
  setText("[data-sub='stat-invoices-sub']", ultima ? `Última: ${ultima.id}` : "Sin facturas todavía");

  setText("[data-plan-name]", plan ? plan.name : "Sin plan");
  setText("[data-plan-price]", plan ? plan.priceFormatted : "—");
  setText("[data-plan-renewal]", plan ? plan.renewal : "—");

  // Los chips "Activo" / "Pagada" solo tienen sentido con datos reales.
  const planBadge = document.querySelector("[data-plan-badge]");
  if (planBadge) planBadge.classList.toggle("hidden", !plan);
  const lastBadge = document.querySelector("[data-last-invoice-badge]");
  if (lastBadge) lastBadge.classList.toggle("hidden", !ultima);

  setText("[data-last-invoice-amount]", ultima ? ultima.amountFormatted : "—");
  setText("[data-last-invoice-meta]", ultima ? `${ultima.id} · ${ultima.period}` : "Sin facturas todavía");

  // Actividad reciente (vacía si no hay tickets ni facturas).
  const lista = document.querySelector("[data-activity-list]");
  if (lista) {
    if (d.activity.length === 0) {
      lista.replaceChildren(emptyRow("Sin actividad todavía"));
      return;
    }
    lista.innerHTML = d.activity
      .map((item) => {
        const icono = ICONOS_ACTIVIDAD[item.type] ?? ICONOS_ACTIVIDAD.security;
        return `<li class="flex items-center gap-3 px-5 py-4">
          <span class="grid size-9 shrink-0 place-items-center rounded-[10px] border ${TONOS_ACTIVIDAD[item.type] ?? TONOS_ACTIVIDAD.security}">${icono}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-100"></p>
            <p class="mt-0.5 text-xs text-slate-400">${item.time}</p>
          </div>
        </li>`;
      })
      .join("");
    // textContent para no interpretar el texto como HTML.
    lista.querySelectorAll("li").forEach((li, i) => {
      li.querySelector(".font-medium").textContent = d.activity[i].text;
    });
  }
}

// Tickets: fila por ticket (textContent para el asunto, nunca innerHTML).
function ticketRow(t) {
  const estado = ESTADO_TICKET[t.status] ?? ESTADO_TICKET.open;
  const li = document.createElement("li");
  li.dataset.status = t.status;
  li.className =
    "flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4";
  li.innerHTML = `
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span class="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[0.68rem] text-slate-400"></span>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-white"></p>
        <p class="mt-0.5 truncate text-xs text-slate-400"></p>
      </div>
    </div>`;
  li.querySelector(".font-mono").textContent = t.id;
  li.querySelector(".font-semibold").textContent = t.subject;
  li.querySelector(".text-xs").textContent = `${t.category} · ${t.createdAt}`;
  li.insertAdjacentHTML("beforeend", chipEstado(estado));
  return li;
}

function renderTickets(d) {
  const lista = document.getElementById("ticket-list");
  if (!lista) return;
  lista.replaceChildren(...(d.tickets.length ? d.tickets.map(ticketRow) : [emptyRow("Sin tickets todavía")]));
  lista.dataset.count = String(d.tickets.length);

  const contador = document.getElementById("ticket-count");
  if (contador) contador.textContent = `${d.tickets.length} registrados`;
}

// Facturas: resumen + historial con descarga PDF real.
function renderFacturas(d) {
  const ultima = d.invoices[0];
  const plan = d.plan;

  setText("[data-invoice-last-amount]", ultima ? ultima.amountFormatted : "—");
  setText("[data-invoice-last-meta]", ultima ? `${ultima.id} · ${ultima.period}` : "Sin facturas todavía");

  const pagadas = d.invoices.filter((i) => i.status === "paid");
  setText("[data-invoice-paid-total]", money(pagadas.reduce((s, i) => s + i.amount * 100, 0)));
  setText("[data-invoice-paid-count]", pagadas.length === 1 ? "1 factura pagada" : `${pagadas.length} facturas pagadas`);

  setText("[data-invoice-next-date]", plan ? proximoCobro() : "—");
  setText("[data-invoice-plan-line]", plan ? `Plan ${plan.name} · ${plan.priceFormatted}` : "Sin plan activo");

  const contador = document.getElementById("invoice-count");
  if (contador) contador.textContent = `${d.invoices.length} facturas`;

  const lista = document.getElementById("invoice-list");
  if (!lista) return;

  const filas = d.invoices.map((inv) => {
    const estado = ESTADO_FACTURA[inv.status] ?? ESTADO_FACTURA.pending;
    const row = document.createElement("li");
    row.className =
      "grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.02] sm:grid-cols-[200px_1fr_auto_auto_auto_auto] sm:items-center";
    row.innerHTML = `
        <div class="col-span-2 min-w-0 sm:col-span-1">
          <p class="inv-id truncate text-sm font-semibold text-white"></p>
          <p class="inv-periodo mt-0.5 text-xs text-slate-400"></p>
        </div>
        <p class="inv-servicio col-span-2 truncate text-xs text-slate-400 sm:col-span-1"></p>
        <p class="inv-monto text-right font-mono text-sm text-white"></p>
        <span class="inv-fecha text-xs text-slate-400"></span>
        <div class="col-span-2 flex items-center justify-between gap-3 sm:col-span-1">
          ${chipEstado(estado)}
          <span class="flex items-center gap-2">
            ${
              inv.status === "pending"
                ? `<button data-pay="${inv.dbId}" class="whitespace-nowrap rounded-[10px] border border-neon/30 bg-neon/10 px-3 py-1.5 text-xs font-semibold text-neon-light transition-colors duration-200 hover:border-neon/50 hover:bg-neon/20" title="Pagar ${inv.id}">Pagar</button>`
                : ""
            }
            <a href="${API_URL}/dashboard/invoices/${inv.dbId}/download" download class="grid size-8 place-items-center rounded-[10px] border border-white/10 bg-white/5 text-slate-400 transition-colors duration-200 hover:border-white/25 hover:text-white" aria-label="Descargar ${inv.id} en PDF" title="Descargar PDF">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
            </a>
          </span>
        </div>`;
    row.querySelector(".inv-id").textContent = `${inv.id} · ${inv.period}`;
    row.querySelector(".inv-periodo").textContent = inv.service;
    row.querySelector(".inv-servicio").textContent = inv.service;
    row.querySelector(".inv-monto").textContent = inv.amountFormatted;
    row.querySelector(".inv-fecha").textContent = inv.date;
    return row;
  });

  lista.replaceChildren(...(filas.length ? filas : [emptyRow("Sin facturas todavía")]));
}

// Cuenta: perfil real + plan (vacío si aún no ha comprado nada) + estado
// del panel de compra (solo existe en la página "Mi cuenta").
function renderCuenta(d) {
  const plan = d.plan;
  setText("[data-account-name]", prettyName(d.user.name));
  setText("[data-account-email]", d.user.email);
  setText("[data-account-member]", d.user.memberSince);
  setText("[data-account-plan-name]", plan ? plan.name : "Sin plan");
  setText("[data-account-plan-price]", plan ? `${plan.priceFormatted}/mes` : "—");
  setText("[data-account-plan-renewal]", plan ? plan.renewal : "—");
  const badge = document.querySelector("[data-account-plan-badge]");
  if (badge) badge.classList.toggle("hidden", !plan);

  // Panel de compra: plan activo vs compra, con la factura pendiente si hay.
  const checkoutPanel = document.getElementById("checkout-panel");
  if (!checkoutPanel) return;

  const planO = (d.plans ?? [])[0] ?? { name: "Pro", priceFormatted: money(30000) };
  setText("[data-checkout-plan-name]", planO.name);
  setText("[data-checkout-plan-price]", planO.priceFormatted);
  setText("[data-checkout-active-plan]", planO.name);

  const activa = document.getElementById("checkout-active");
  const compra = document.getElementById("checkout-purchase");
  const pendingBox = document.getElementById("checkout-pending-box");
  const buyBtn = document.getElementById("checkout-buy");
  const payBtn = document.getElementById("checkout-pay");

  activa?.classList.toggle("hidden", !plan);
  compra?.classList.toggle("hidden", Boolean(plan));

  const pendiente = d.invoices.find((i) => i.status === "pending") ?? null;
  pendingBox?.classList.toggle("hidden", !pendiente);
  if (pendiente) setText("[data-checkout-pending-id]", pendiente.id);
  // Con compra pendiente el botón pasa de "Comprar" a "Pagar".
  buyBtn?.classList.toggle("hidden", Boolean(pendiente));
  payBtn?.classList.toggle("hidden", !pendiente);
  if (payBtn && pendiente) payBtn.dataset.payId = String(pendiente.dbId);
}

// ----------------------------------------------------------------
//  Main
// ----------------------------------------------------------------

const main = async () => {
  // 1) Guard de sesión real: valida la cookie contra /auth/me.
  const user = await requireSession(API_URL);
  if (!user) return;

  // 2) Hidrata la identidad con los datos reales de la sesión.
  const name = prettyName(user.name ?? "");
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = name));
  document.querySelectorAll("[data-user-email]").forEach((el) => (el.textContent = user.email));
  document.querySelectorAll("[data-user-initials]").forEach((el) => (el.textContent = initials));
  const greeting = document.querySelector("[data-greeting]");
  if (greeting) greeting.textContent = `Hola, ${name.split(/\s+/)[0]}`;

  // 3) Sidebar mobile (drawer + overlay).
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  function openSidebar() {
    sidebar?.classList.remove("translate-x-full");
    overlay?.classList.remove("hidden");
  }

  function closeSidebar() {
    sidebar?.classList.add("translate-x-full");
    overlay?.classList.add("hidden");
  }

  document.querySelectorAll("[data-sidebar-toggle]").forEach((btn) =>
    btn.addEventListener("click", openSidebar)
  );
  document.querySelectorAll("[data-sidebar-close]").forEach((btn) =>
    btn.addEventListener("click", closeSidebar)
  );
  overlay?.addEventListener("click", closeSidebar);

  // 4) Toast (glass oscuro, coherente con el área de auth).
  let toastTimer;
  function toast(message, type = "info") {
    let el = document.getElementById("dash-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "dash-toast";
      el.setAttribute("role", "status");
      el.className =
        "fixed bottom-5 left-4 right-4 z-[100] mx-auto max-w-md translate-y-3 rounded-[14px] border px-4 py-3 text-sm font-medium opacity-0 backdrop-blur-xl transition-all duration-300 sm:left-auto sm:right-6 sm:mx-0 sm:w-auto";
      document.body.appendChild(el);
    }
    el.classList.remove(
      "border-neon/30", "text-neon-light",
      "border-white/15", "text-slate-200",
      "translate-y-3", "opacity-0"
    );
    el.classList.add(
      "bg-navy-800/95",
      ...(type === "success" ? ["border-neon/30", "text-neon-light"] : ["border-white/15", "text-slate-200"])
    );
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add("translate-y-3", "opacity-0");
    }, 3800);
  }

  // 5) Carga real del dashboard.
  const data = await cargarDashboard();
  if (!data) return; // 401 → ya redirigió a /login.

  renderResumen(data);
  renderTickets(data);
  renderFacturas(data);
  renderCuenta(data);

  // 6) Nuevo ticket: lo crea en el backend.
  const ticketPanel = document.getElementById("new-ticket-panel");
  const ticketForm = document.getElementById("new-ticket-form");

  document.querySelector("[data-open-ticket-form]")?.addEventListener("click", () => {
    ticketPanel?.classList.remove("hidden");
    ticketPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("[data-close-ticket-form]")?.addEventListener("click", () => {
    ticketPanel?.classList.add("hidden");
  });

  ticketForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const cuerpo = {
      subject: ticketForm.elements["subject"].value.trim(),
      category: ticketForm.elements["category"].value,
      priority: ticketForm.elements["priority"].value,
      description: ticketForm.elements["description"].value.trim(),
    };

    const res = await fetch(`${API_URL}/dashboard/tickets`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const payload = await res.json();

    if (res.status === 401) {
      location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast(payload.error ?? "No se pudo crear el ticket.");
      return;
    }

    const lista = document.getElementById("ticket-list");
    lista?.prepend(ticketRow({ ...payload, createdAt: "hoy" }));
    if (lista) lista.dataset.count = String(Number(lista.dataset.count ?? 0) + 1);
    const contador = document.getElementById("ticket-count");
    if (contador) contador.textContent = `${lista.dataset.count} registrados`;

    ticketPanel?.classList.add("hidden");
    ticketForm.reset();
    toast(`Ticket ${payload.id} creado. Nuestro equipo te responderá en menos de 24 h.`, "success");
  });

  // 7) Filtros de tickets.
  const filterChips = document.querySelectorAll("[data-filter]");
  filterChips.forEach((chip) =>
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      filterChips.forEach((other) => {
        const isActive = other === chip;
        other.classList.toggle("border-white/25", isActive);
        other.classList.toggle("bg-white/10", isActive);
        other.classList.toggle("text-white", isActive);
        other.classList.toggle("border-white/10", !isActive);
        other.classList.toggle("text-slate-400", !isActive);
      });
      document.querySelectorAll("#ticket-list > li").forEach((li) => {
        li.classList.toggle("hidden", filter !== "all" && li.dataset.status !== filter);
      });
    })
  );

  // 8) Recarga el dashboard completo y re-renderiza (después de comprar/pagar).
  async function refresh() {
    const data = await cargarDashboard();
    if (!data) return null;
    renderResumen(data);
    renderTickets(data);
    renderFacturas(data);
    renderCuenta(data);
    return data;
  }

  // 9) Edición de perfil (nombre inmediato + correo con confirmación).
  const profilePanel = document.getElementById("profile-panel");
  const profileForm = document.getElementById("profile-form");

  document.querySelector("[data-open-profile-form]")?.addEventListener("click", () => {
    if (!profilePanel || !profileForm) return;
    profileForm.elements["name"].value =
      document.querySelector("[data-account-name]")?.textContent ?? "";
    profileForm.elements["email"].value =
      document.querySelector("[data-account-email]")?.textContent ?? "";
    profilePanel.classList.remove("hidden");
    profilePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("[data-close-profile-form]")?.addEventListener("click", () => {
    profilePanel?.classList.add("hidden");
  });

  profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const res = await fetch(`${API_URL}/dashboard/profile`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: profileForm.elements["name"].value.trim(),
        email: profileForm.elements["email"].value.trim(),
      }),
    });
    const payload = await res.json();

    if (res.status === 401) {
      location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast(payload.error ?? "No se pudo actualizar el perfil.");
      return;
    }

    setText("[data-account-name]", prettyName(payload.name));
    setText("[data-account-email]", payload.email);
    profilePanel?.classList.add("hidden");
    toast(payload.message, payload.pendingEmail ? "info" : "success");
  });

  // 10) Pago de una factura pendiente (botón del panel de compra y de la
  // lista de facturas). Delegado: sobrevive a los re-renders de las filas.
  async function pagarFactura(dbId) {
    const res = await fetch(`${API_URL}/dashboard/invoices/${dbId}/pay`, {
      method: "POST",
      credentials: "same-origin",
    });
    const payload = await res.json();

    if (res.status === 401) {
      location.href = "/login";
      return false;
    }
    if (!res.ok) {
      toast(payload.error ?? "No se pudo procesar el pago.");
      return false;
    }
    toast(payload.message, "success");
    return true;
  }

  document.addEventListener("click", async (event) => {
    const payRowBtn = event.target.closest("[data-pay]");
    if (!payRowBtn) return;
    event.preventDefault();
    payRowBtn.disabled = true;
    const ok = await pagarFactura(Number(payRowBtn.dataset.pay));
    if (ok) await refresh();
  });

  // 11) Panel de compra de plan (suscribir + pagar).
  const checkoutPanel = document.getElementById("checkout-panel");

  document.querySelector("[data-open-checkout]")?.addEventListener("click", () => {
    checkoutPanel?.classList.remove("hidden");
    checkoutPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("[data-close-checkout]")?.addEventListener("click", () => {
    checkoutPanel?.classList.add("hidden");
  });

  document.getElementById("checkout-buy")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;

    const res = await fetch(`${API_URL}/dashboard/subscribe`, {
      method: "POST",
      credentials: "same-origin",
    });
    const payload = await res.json();
    btn.disabled = false;

    if (res.status === 401) {
      location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast(payload.error ?? "No se pudo crear la compra.");
      return;
    }

    toast(payload.message, "success");
    await refresh();
  });

  document.getElementById("checkout-pay")?.addEventListener("click", async (event) => {
    const btn = event.currentTarget;
    const dbId = Number(btn.dataset.payId);
    if (!dbId) return;
    btn.disabled = true;
    const ok = await pagarFactura(dbId);
    btn.disabled = false;
    if (ok) await refresh();
  });

  // 12) Cambio de contraseña contra el backend.
  document.getElementById("password-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const nueva = form.elements["new"].value;
    if (form.elements["confirm"].value !== nueva) {
      toast("Las contraseñas nuevas no coinciden.");
      return;
    }

    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        current: form.elements["current"].value,
        new_password: nueva,
      }),
    });
    const payload = await res.json();

    if (res.status === 401) {
      location.href = "/login";
      return;
    }
    if (!res.ok) {
      toast(payload.error ?? "No se pudo cambiar la contraseña.");
      return;
    }
    form.reset();
    toast("Contraseña actualizada correctamente.", "success");
  });

  // 13) Cerrar sesión: invalida la cookie en el servidor y vuelve a /login.
  document.getElementById("logout")?.addEventListener("click", () => {
    void logout(API_URL);
  });
};

void main();
