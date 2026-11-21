import {
  isWebsiteOnline,
  setStatusClass,
  setText,
  setValueStatus,
  statusIcons,
} from "../scripts/dashboard.utils.js";

function updateHeroFeature(index, label, isActive) {
  const feature = document.querySelectorAll("[data-dashboard-feature]")[index];

  if (!feature) {
    return;
  }

  feature.classList.toggle("is-pending", !isActive);
  feature.querySelector("[data-dashboard-feature-icon]").innerHTML =
    isActive ? statusIcons.ready : statusIcons.pending;
  feature.querySelector("[data-dashboard-feature-label]").textContent = label;
}

export function renderHero(website) {
  if (!website) {
    setText("#dashboard-hero-badge-text", "Sin servicio activo");
    setText("#dashboard-hero-title", "Aun no tienes un sitio activo.");
    setText(
      "#dashboard-hero-description",
      "Cuando tu servicio este listo, aqui veras el estado principal de tu sitio, dominio, SSL y monitoreo."
    );
    setText("#dashboard-hero-availability", "Sin datos");
    setText("#dashboard-hero-domain", "Pendiente");
    setText("#dashboard-hero-ssl", "Pendiente");
    setText("#dashboard-hero-monitoring", "Pendiente");
    setStatusClass("#dashboard-hero-dot", false);
    setStatusClass("#dashboard-hero-panel-dot", false);
    setValueStatus("#dashboard-hero-domain", false);
    setValueStatus("#dashboard-hero-ssl", false);
    setValueStatus("#dashboard-hero-monitoring", false);
    return;
  }

  const isOnline = isWebsiteOnline(website);
  const hasDomain = Boolean(website.domain);
  const hasSsl = Boolean(website.ssl);
  const hasMonitoring = website.monitoring !== false && isOnline;

  setText(
    "#dashboard-hero-badge-text",
    isOnline ? "Todo funciona correctamente" : "Servicio en preparacion"
  );
  setText("#dashboard-hero-title", `${website.domain ?? "Tu sitio esta listo."}`);
  setText(
    "#dashboard-hero-description",
    isOnline
      ? "Nos encargamos del mantenimiento, seguridad y estabilidad de este sitio para que puedas enfocarte en tu negocio."
      : "Este sitio se encuentra en preparacion. Aqui veras su avance, configuracion y estado cuando este listo."
  );
  setText("#dashboard-hero-availability", website.availability ?? (isOnline ? "100%" : "Sin datos"));
  setText("#dashboard-hero-domain", hasDomain ? "Conectado" : "Pendiente");
  setText("#dashboard-hero-ssl", hasSsl ? "Activo" : "Pendiente");
  setText("#dashboard-hero-monitoring", hasMonitoring ? "En linea" : "Pendiente");

  setStatusClass("#dashboard-hero-dot", isOnline);
  setStatusClass("#dashboard-hero-panel-dot", isOnline);
  setValueStatus("#dashboard-hero-domain", hasDomain);
  setValueStatus("#dashboard-hero-ssl", hasSsl);
  setValueStatus("#dashboard-hero-monitoring", hasMonitoring);

  updateHeroFeature(0, hasDomain ? "Dominio conectado" : "Dominio pendiente", hasDomain);
  updateHeroFeature(1, hasSsl ? "SSL activo" : "SSL pendiente", hasSsl);
  updateHeroFeature(2, hasMonitoring ? "Monitoreo continuo" : "Monitoreo pendiente", hasMonitoring);
}
