import { formatChanges, formatDate, formatPlan, formatStatus } from "../scripts/dashboard.utils.js";

export function renderService(website) {
  const container = document.getElementById("dashboard-services");
  const template = document.getElementById("dashboard-service-template");

  if (!container || !template) {
    return;
  }

  if (!website) {
    return;
  }

  container.textContent = "";

  const service = template.content.firstElementChild.cloneNode(true);
  const plan = website.plan ?? {};

  service.querySelector("[data-service-domain]").textContent =
    website.domain ?? "Dominio pendiente";
  service.querySelector("[data-service-status]").textContent = formatStatus(website);
  service.querySelector("[data-service-plan]").textContent = formatPlan(website);
  service.querySelector("[data-service-plan-info]").textContent =
    plan.description ?? "Informacion del plan";
  service.querySelector("[data-service-changes]").textContent = formatChanges(website);
  service.querySelector("[data-service-renewal]").textContent = formatDate(
    plan.renewal ?? website.renewal
  );
  service.querySelector("[data-service-renewal-info]").textContent =
    plan.renewal || website.renewal ? "Pago automatico" : "Sin fecha programada";

  container.append(service);
}
