import { capitalizeName, formatStatus, setText } from "../scripts/dashboard.utils.js";

export function renderDashboardUser(user) {
  setText("#dashboard-name", capitalizeName(user?.name));

  const profileEmail = document.getElementById("dashboard-profile-email");
  const profileName = document.getElementById("dashboard-profile-name");
  const profilePhone = document.getElementById("dashboard-profile-phone");

  if (profileEmail) {
    profileEmail.value = user?.email ?? "";
  }

  if (profileName) {
    profileName.value = capitalizeName(user?.name);
  }

  if (profilePhone) {
    profilePhone.value = user?.phone ?? "";
  }
}

export function renderWebsiteSelector(websites, selectedWebsite, onSelect) {
  const selector = document.getElementById("dashboard-sites");
  const list = document.getElementById("dashboard-sites-list");

  if (!selector || !list) {
    return;
  }

  selector.hidden = websites.length <= 1;
  list.textContent = "";

  if (websites.length <= 1) {
    return;
  }

  websites.forEach((website) => {
    const card = document.createElement("button");
    const domain = document.createElement("span");
    const status = document.createElement("span");
    const isSelected = website.id === selectedWebsite?.id;

    card.type = "button";
    card.className = `dashboard-site-card ${isSelected ? "is-active" : ""}`;
    card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    card.addEventListener("click", () => onSelect(website.id));

    domain.className = "dashboard-site-domain";
    domain.textContent = website.domain ?? website.name ?? "Sitio web";

    status.className = "dashboard-site-status";
    status.textContent = formatStatus(website);

    card.append(domain, status);
    list.append(card);
  });
}
