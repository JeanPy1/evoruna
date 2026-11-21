export function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

export function capitalizeName(value) {
  const name = String(value ?? "").trim();

  if (!name) {
    return "Usuario";
  }

  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function setStatusClass(selector, isActive) {
  document.querySelector(selector)?.classList.toggle("is-online", isActive);
}

export function setValueStatus(selector, isActive) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.classList.toggle("success", isActive);
  element.classList.toggle("muted", !isActive);
}

export function statusIcon(type, size, strokeWidth = 2) {
  const compact = size === 18 ? ' data-icon-size="compact"' : "";
  const content = type === "ready"
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>'
    : `
      <circle cx="12" cy="12" r="8.5"></circle>
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 2"></path>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"></circle>
    `;

  return `
    <svg fill="none" stroke="currentColor" stroke-width="${strokeWidth}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"${compact}>
      ${content}
    </svg>
  `;
}

export const statusIcons = {
  ready: statusIcon("ready", 18),
  pending: statusIcon("pending", 18),
  readyLarge: statusIcon("ready", 24, 2.2),
  pendingLarge: statusIcon("pending", 24, 2.1),
};

export function normalizeWebsites(dashboard) {
  if (Array.isArray(dashboard?.websites)) {
    return dashboard.websites;
  }

  if (dashboard?.website) {
    return [
      {
        ...dashboard.website,
        plan: dashboard.plan,
      },
    ];
  }

  return [];
}

export function isWebsiteOnline(website) {
  return ["active", "online", "published"].includes(
    String(website?.status ?? "").toLowerCase()
  );
}

export function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatStatus(website) {
  if (isWebsiteOnline(website)) {
    return "Sitio publicado";
  }

  if (String(website?.status ?? "").toLowerCase() === "preparing") {
    return "En preparacion";
  }

  return "Pendiente";
}

export function formatPlan(website) {
  return website?.plan?.name ?? website?.plan_name ?? "Sin plan";
}

export function formatChanges(website) {
  const plan = website?.plan ?? {};
  const left = website?.changes_left ?? website?.changesLeft;
  const total = plan.changes_total ?? plan.changesTotal;

  if (left === undefined || total === undefined) {
    return "Sin datos";
  }

  return `${left} / ${total}`;
}

export function getFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function sanitizeName(value) {
  return String(value ?? "").replace(/[^A-Za-z\u00c1\u00c9\u00cd\u00d3\u00da\u00e1\u00e9\u00ed\u00f3\u00fa\u00d1\u00f1 ]/g, "");
}

export function sanitizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

