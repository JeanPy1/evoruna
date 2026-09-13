import {
  renderActionHistory,
  renderReceipts,
  setupActionPanel,
  updateActionAvailability,
} from "../components/action-panel.js";
import { renderRoadmap } from "../components/activity.js";
import { renderDashboardUser, renderWebsiteSelector } from "../components/header.js";
import { renderHero } from "../components/hero.js";
import { renderService } from "../components/status-card.js";
import { normalizeWebsites } from "./dashboard.utils.js";

const API_URL = document.getElementById("dashboard")?.dataset.apiUrl ?? "";

let dashboardWebsites = [];
let selectedWebsiteId = null;

function showDashboard() {
  document.getElementById("loader")?.remove();

  const dashboard = document.getElementById("dashboard");

  if (dashboard) {
    dashboard.hidden = false;
  }
}

async function loadDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard`, { credentials: "include" });

    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Redirect below when the session cannot be confirmed.
  }

  sessionStorage.removeItem("evoruna_session_hint");
  window.location.replace("/login");
  return null;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.detail ?? "No se pudo completar la accion");
  }

  return payload;
}

function getSelectedWebsite() {
  return (
    dashboardWebsites.find((website) => website.id === selectedWebsiteId) ??
    dashboardWebsites[0] ??
    null
  );
}

function addWebsiteHistoryItem(kind, item) {
  const selectedWebsite = getSelectedWebsite();

  if (!selectedWebsite || !item) {
    return;
  }

  const key = kind === "change" ? "change_requests" : "tickets";
  selectedWebsite[key] = [item, ...(selectedWebsite[key] ?? [])].slice(0, 5);
}

function updateSelectedWebsiteChanges(changesLeft) {
  const selectedWebsite = getSelectedWebsite();

  if (!selectedWebsite || changesLeft === undefined || changesLeft === null) {
    return;
  }

  selectedWebsite.changes_left = changesLeft;
}

function removeWebsiteHistoryItem(kind, itemId) {
  const selectedWebsite = getSelectedWebsite();

  if (!selectedWebsite) {
    return;
  }

  const key = kind === "change" ? "change_requests" : "tickets";
  selectedWebsite[key] = (selectedWebsite[key] ?? []).filter((item) => item.id !== itemId);
}

function renderSelectedWebsite() {
  const selectedWebsite = getSelectedWebsite();

  renderWebsiteSelector(dashboardWebsites, selectedWebsite, selectWebsite);
  renderHero(selectedWebsite);
  renderService(selectedWebsite);
  renderRoadmap(selectedWebsite);
  updateActionAvailability();
  renderActionHistory("change");
  renderActionHistory("support");

  if (document.querySelector('[data-action-view="billing"]')?.classList.contains("is-active")) {
    renderReceipts();
  }
}

function selectWebsite(websiteId) {
  selectedWebsiteId = websiteId;
  renderSelectedWebsite();
}

function renderDashboard(dashboard) {
  dashboardWebsites = normalizeWebsites(dashboard);
  selectedWebsiteId = dashboardWebsites[0]?.id ?? null;

  renderDashboardUser(dashboard?.user);
  renderSelectedWebsite();
}

function setupDashboardActions() {
  setupActionPanel({
    apiUrl: API_URL,
    requestJson,
    getSelectedWebsite,
    onActionCreated(kind, item, changesLeft) {
      addWebsiteHistoryItem(kind, item);
      updateSelectedWebsiteChanges(changesLeft);
      renderSelectedWebsite();
    },
    onChangeDeleted(requestId, changesLeft) {
      removeWebsiteHistoryItem("change", requestId);
      updateSelectedWebsiteChanges(changesLeft);
      renderSelectedWebsite();
    },
    onTicketDeleted(ticketId) {
      removeWebsiteHistoryItem("support", ticketId);
      renderSelectedWebsite();
    },
  });
}

async function init() {
  const hasSessionHint = sessionStorage.getItem("evoruna_session_hint");

  if (!hasSessionHint) {
    window.location.replace("/login");
    return;
  }

  const dashboard = await loadDashboard();

  if (dashboard) {
    renderDashboard(dashboard);
    setupDashboardActions();
    showDashboard();
  }
}

init();
