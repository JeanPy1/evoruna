import {
  capitalizeName,
  getFormData,
  sanitizeName,
  sanitizePhone,
  setText,
} from "../scripts/dashboard.utils.js";

let context = null;

function getSelectedWebsite() {
  return context?.getSelectedWebsite?.() ?? null;
}

function renderHistory(containerId, items, emptyText, options = {}) {
  const container = document.getElementById(containerId);

  if (!container) {
    return;
  }

  container.textContent = "";

  if (!items || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dashboard-empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("article");
    const header = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const status = document.createElement("span");

    row.className = "dashboard-history-item";
    header.className = "dashboard-history-item-header";
    title.textContent = item.title ?? "Sin titulo";
    detail.textContent = item.description ?? item.message ?? "";
    status.textContent = `Estado: ${item.status ?? "pendiente"}`;

    header.append(title);

    if (options.canDelete?.(item)) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "dashboard-history-delete";
      deleteButton.textContent = "Eliminar";
      deleteButton.addEventListener("click", () => options.onDelete?.(item.id));
      header.append(deleteButton);
    }

    row.append(header, detail, status);
    container.append(row);
  });
}

export function renderActionHistory(actionId = "change") {
  const selectedWebsite = getSelectedWebsite();

  if (!selectedWebsite) {
    renderHistory(
      "dashboard-change-history",
      [],
      "Necesitas un servicio activo para ver solicitudes."
    );
    renderHistory(
      "dashboard-ticket-history",
      [],
      "Necesitas un servicio activo para ver tickets."
    );
    return;
  }

  if (actionId === "change") {
    renderHistory(
      "dashboard-change-history",
      selectedWebsite.change_requests ?? [],
      "Aun no tienes solicitudes recientes.",
      {
        canDelete: (item) => item.status === "pending",
        onDelete: deleteChangeRequest,
      }
    );
  }

  if (actionId === "support") {
    renderHistory(
      "dashboard-ticket-history",
      selectedWebsite.tickets ?? [],
      "Aun no tienes tickets recientes.",
      {
        canDelete: (item) => item.status === "open",
        onDelete: deleteSupportTicket,
      }
    );
  }
}

export function renderReceipts() {
  const container = document.getElementById("dashboard-invoices");

  if (!container) {
    return;
  }

  const selectedWebsite = getSelectedWebsite();
  const receipts = selectedWebsite?.receipts ?? [];

  if (!receipts.length) {
    container.textContent = selectedWebsite
      ? "Aun no tienes recibos disponibles para este sitio."
      : "Necesitas un servicio activo para ver recibos.";
    return;
  }

  container.textContent = "";
  receipts.forEach((receipt) => {
    const row = document.createElement("article");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const download = document.createElement("button");

    row.className = "dashboard-history-item";
    title.textContent = receipt.concept;
    meta.textContent = `${receipt.receipt_number} - ${receipt.currency} ${receipt.amount} - ${receipt.status}`;
    download.type = "button";
    download.className = "dashboard-history-delete";
    download.textContent = "Descargar PDF";
    download.addEventListener("click", () => downloadReceipt(receipt));

    row.append(title, meta, download);
    container.append(row);
  });
}

export function updateActionAvailability() {
  const panel = document.getElementById("dashboard-action-panel");
  const hasService = Boolean(getSelectedWebsite());

  panel?.classList.toggle("has-no-service", !hasService);
}

function setActiveAction(actionId) {
  document.querySelectorAll("[data-dashboard-action]").forEach((action) => {
    const isActive = action.dataset.dashboardAction === actionId;
    action.classList.toggle("is-active", isActive);
    action.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-action-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.actionView === actionId);
  });

  document.getElementById("dashboard-action-panel")?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });

  if (actionId === "change" || actionId === "support") {
    renderActionHistory(actionId);
  }

  if (actionId === "billing") {
    renderReceipts();
  }
}

async function downloadReceipt(receipt) {
  try {
    const response = await fetch(`${context.apiUrl}${receipt.download_url}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No se pudo descargar el recibo");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `recibo-${receipt.receipt_number}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    window.showToast?.(error.message);
  }
}

async function deleteChangeRequest(requestId) {
  try {
    const data = await context.requestJson(`/dashboard/actions/change-requests/${requestId}`, {
      method: "DELETE",
    });

    context.onChangeDeleted?.(requestId, data?.changes_left);
    renderActionHistory("change");
    window.showToast?.("Solicitud eliminada", "success");
  } catch (error) {
    window.showToast?.(error.message);
  }
}

async function deleteSupportTicket(ticketId) {
  try {
    await context.requestJson(`/dashboard/actions/tickets/${ticketId}`, {
      method: "DELETE",
    });

    context.onTicketDeleted?.(ticketId);
    renderActionHistory("support");
    window.showToast?.("Ticket eliminado", "success");
  } catch (error) {
    window.showToast?.(error.message);
  }
}

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector("button[type='submit']");

  if (button) {
    button.disabled = isSubmitting;
  }
}

function ensureSelectedWebsite(message) {
  const selectedWebsite = getSelectedWebsite();

  if (!selectedWebsite) {
    window.showToast?.(message);
    return null;
  }

  return selectedWebsite;
}

async function submitServiceAction({ form, values, kind, apiType, payload, successMessage }) {
  const selectedWebsite = ensureSelectedWebsite(
    kind === "change"
      ? "Necesitas un servicio activo para solicitar cambios."
      : "Necesitas un servicio activo para crear tickets."
  );

  if (!selectedWebsite) {
    return;
  }

  if (kind === "change" && (selectedWebsite.changes_left ?? 0) <= 0) {
    window.showToast?.("Ya no tienes cambios disponibles este periodo.");
    return;
  }

  if (kind === "support" && (selectedWebsite.tickets ?? []).some((ticket) => ticket.status === "open")) {
    window.showToast?.("Ya tienes un ticket abierto. Espera respuesta o eliminalo para crear otro.");
    return;
  }

  const data = await context.requestJson("/dashboard/actions", {
    method: "POST",
    body: JSON.stringify({
      type: apiType,
      website_id: selectedWebsite.id,
      ...payload(values),
    }),
  });

  form.reset();
  context.onActionCreated?.(kind, data?.item, data?.changes_left);
  window.showToast?.(successMessage, "success");
}

async function submitProfile(values) {
  const name = sanitizeName(values.name).trim();
  const phone = sanitizePhone(values.phone);

  if (name.length < 2) {
    window.showToast?.("El nombre solo debe tener letras.");
    return;
  }

  const data = await context.requestJson("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ name, phone }),
  });

  setText("#dashboard-name", capitalizeName(data?.name ?? name));
  window.showToast?.("Datos actualizados", "success");
}

async function submitPassword(form, values) {
  await context.requestJson("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: values.current_password,
      new_password: values.new_password,
    }),
  });

  form.reset();
  window.showToast?.("Contrasena actualizada", "success");
}

async function handleDashboardForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const type = form.dataset.dashboardForm;
  const values = getFormData(form);

  setSubmitting(form, true);

  try {
    if (type === "change") {
      await submitServiceAction({
        form,
        values,
        kind: "change",
        apiType: "change_request",
        payload: ({ title, description }) => ({ title, description }),
        successMessage: "Solicitud enviada",
      });
    }

    if (type === "profile") {
      await submitProfile(values);
    }

    if (type === "password") {
      await submitPassword(form, values);
    }

    if (type === "support") {
      await submitServiceAction({
        form,
        values,
        kind: "support",
        apiType: "support_ticket",
        payload: ({ subject, message }) => ({ subject, message }),
        successMessage: "Ticket creado",
      });
    }
  } catch (error) {
    window.showToast?.(error.message);
  } finally {
    setSubmitting(form, false);
  }
}

export function setupActionPanel(options) {
  context = options;

  const profileName = document.getElementById("dashboard-profile-name");
  const profilePhone = document.getElementById("dashboard-profile-phone");

  profileName?.addEventListener("input", () => {
    profileName.value = sanitizeName(profileName.value);
  });

  profilePhone?.addEventListener("input", () => {
    profilePhone.value = sanitizePhone(profilePhone.value);
  });

  document.querySelectorAll("[data-dashboard-action]").forEach((action) => {
    action.addEventListener("click", () => {
      setActiveAction(action.dataset.dashboardAction);
    });
  });

  document.querySelectorAll("[data-dashboard-form]").forEach((form) => {
    form.addEventListener("submit", handleDashboardForm);
  });

  setActiveAction("change");
  updateActionAvailability();
}
