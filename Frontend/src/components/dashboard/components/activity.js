import { isWebsiteOnline, statusIcons } from "../scripts/dashboard.utils.js";

function buildRoadmapFromWebsite(website) {
  if (!website) {
    return [];
  }

  return [
    {
      title: `${website.domain ?? "Sitio web"} publicado`,
      description: isWebsiteOnline(website)
        ? "El sitio ya esta disponible en Internet."
        : "El sitio aun se encuentra en preparacion.",
      status: isWebsiteOnline(website) ? "Completado" : "Pendiente",
      completed: isWebsiteOnline(website),
    },
    {
      title: "Dominio conectado",
      description: website.domain
        ? "El dominio esta asociado al servicio."
        : "Aun falta asociar un dominio.",
      status: website.domain ? "Completado" : "Pendiente",
      completed: Boolean(website.domain),
    },
    {
      title: "Certificado SSL activo",
      description: website.ssl
        ? "La conexion HTTPS esta protegida."
        : "El certificado SSL aun no esta activo.",
      status: website.ssl ? "Completado" : "Pendiente",
      completed: Boolean(website.ssl),
    },
  ];
}

function getRoadmapFromWebsite(website) {
  if (!Array.isArray(website?.roadmap) || website.roadmap.length === 0) {
    return [];
  }

  return website.roadmap;
}

export function renderRoadmap(website) {
  const container = document.getElementById("dashboard-roadmap-list");
  const template = document.getElementById("dashboard-roadmap-template");
  const websiteRoadmap = getRoadmapFromWebsite(website);
  const roadmap = websiteRoadmap.length > 0
    ? websiteRoadmap
    : buildRoadmapFromWebsite(website);

  if (!container || !template || roadmap.length === 0) {
    return;
  }

  container.textContent = "";

  roadmap.forEach((item) => {
    const row = template.content.firstElementChild.cloneNode(true);
    const isCompleted = Boolean(item.completed);

    row.querySelector("[data-roadmap-dot]").classList.toggle("pending", !isCompleted);
    row.querySelector("[data-roadmap-icon]").innerHTML =
      isCompleted ? statusIcons.readyLarge : statusIcons.pendingLarge;
    row.querySelector("[data-roadmap-title]").textContent = item.title ?? "Actividad";
    row.querySelector("[data-roadmap-description]").textContent = item.description ?? "";
    row.querySelector("[data-roadmap-status]").textContent =
      item.status ?? (isCompleted ? "Completado" : "Pendiente");

    container.append(row);
  });
}
