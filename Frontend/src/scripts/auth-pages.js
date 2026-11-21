// Lógica de las páginas de autenticación.
//
// IMPORTANTE: este archivo se carga con <script src="..."> SIN el atributo
// type="module". Astro solo procesa y bunea los <script> que no llevan
// atributos distintos de "src"; si se añade type="module" el script se queda
// "is:inline" y sus imports relativos no se resuelven en el build estático
// (404 en preview y en producción).
//
// La página se detecta por el atributo data-auth-page que renderiza AuthShell.

import {
  MESSAGES,
  homePathFor,
  readJson,
  redirectIfAuthenticated,
} from "./auth.js";

const API_URL = import.meta.env.PUBLIC_API_URL ?? "/api";

const page = document.querySelector("[data-auth-page]")?.dataset.authPage;

// ---------------------------------------------------------------- login
function initLogin() {
  const form = document.getElementById("form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const submitButton = document.getElementById("submit");

  const pending = new URLSearchParams(window.location.search).get("msg");
  if (pending && MESSAGES[pending]) window.showAuthMessage(MESSAGES[pending]);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      window.showAuthMessage(MESSAGES.incomplete);
      return;
    }

    const label = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Ingresando...";

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await readJson(response);

      if (response.ok) {
        window.location.replace(homePathFor(data));
        return;
      }

      window.showAuthMessage({
        type: "error",
        text: data.error || MESSAGES.login_failed.text,
      });
    } catch {
      window.showAuthMessage(MESSAGES.network);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = label;
    }
  });

  void redirectIfAuthenticated(API_URL);
}

// ------------------------------------------------------------- register
function initRegister() {
  const form = document.getElementById("form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("password-confirm");
  const submitButton = document.getElementById("submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    if (!name || !email || !password || !confirmPassword) {
      window.showAuthMessage(MESSAGES.incomplete);
      return;
    }

    if (password !== confirmPassword) {
      window.showAuthMessage(MESSAGES.mismatch);
      return;
    }

    const label = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Creando cuenta...";

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await readJson(response);

      if (response.ok) {
        form.reset();
        window.showAuthMessage(MESSAGES.email_sent);
        return;
      }

      window.showAuthMessage({
        type: "error",
        text: data.error || MESSAGES.register_failed.text,
      });
    } catch {
      window.showAuthMessage(MESSAGES.network);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = label;
    }
  });

  void redirectIfAuthenticated(API_URL);
}

// --------------------------------------------------------------- forgot
function initForgot() {
  const form = document.getElementById("form");
  const emailInput = document.getElementById("email");
  const submitButton = document.getElementById("submit");

  const pending = new URLSearchParams(window.location.search).get("msg");
  if (pending && MESSAGES[pending]) window.showAuthMessage(MESSAGES[pending]);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
      window.showAuthMessage(MESSAGES.incomplete);
      return;
    }

    const label = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await readJson(response);

      if (response.ok) {
        window.location.replace("/login?msg=recovery_sent");
        return;
      }

      window.showAuthMessage({
        type: "error",
        text: data.error || MESSAGES.forgot_failed.text,
      });
    } catch {
      window.showAuthMessage(MESSAGES.network);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = label;
    }
  });

  void redirectIfAuthenticated(API_URL);
}

// ----------------------------------------------------------------- reset
async function initReset() {
  const token = new URLSearchParams(window.location.search).get("token");

  const pageEl = document.getElementById("page");
  const form = document.getElementById("form");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("password-confirm");
  const submitButton = document.getElementById("submit");

  function showPage() {
    document.getElementById("loader")?.remove();
    pageEl.hidden = false;
  }

  async function isTokenValid() {
    try {
      const response = await fetch(
        `${API_URL}/auth/validate-reset-token?token=${encodeURIComponent(token)}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // Si el backend confirma una sesión válida, se va directo al panel en
  // lugar de cambiar la contraseña de una cuenta ajena.
  async function alreadyAuthenticated() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) return false;

      const user = await readJson(response);
      window.location.replace(homePathFor(user));
      return true;
    } catch {
      return false;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();

    if (!password || !confirmPassword) {
      window.showAuthMessage(MESSAGES.incomplete);
      return;
    }

    if (password !== confirmPassword) {
      window.showAuthMessage(MESSAGES.mismatch);
      return;
    }

    const label = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Guardando...";

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      const data = await readJson(response);

      if (response.ok) {
        window.showAuthMessage(MESSAGES.password_changed);
        setTimeout(() => window.location.replace("/login"), 2000);
        return;
      }

      window.showAuthMessage({
        type: "error",
        text: data.error || MESSAGES.reset_failed.text,
      });
    } catch {
      window.showAuthMessage(MESSAGES.network);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = label;
    }
  });

  if (!token) {
    window.location.replace("/forgot");
    return;
  }

  if (await alreadyAuthenticated()) return;

  if (!(await isTokenValid())) {
    window.location.replace("/forgot?msg=invalid_token");
    return;
  }

  showPage();
}

// -------------------------------------------------------- verify-email
async function initVerifyEmail() {
  const loadingState = document.getElementById("estado-carga");
  const successState = document.getElementById("estado-exito");
  const errorState = document.getElementById("estado-error");
  const errorMessage = document.getElementById("error-mensaje");

  function show(state) {
    loadingState.classList.add("hidden");
    state.classList.remove("hidden");
    state.classList.add("flex");
  }

  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    show(errorState);
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
    );
    let data = {};
    try {
      data = await response.json();
    } catch {
      /* el cuerpo puede no ser JSON */
    }

    if (response.ok) {
      show(successState);
      setTimeout(() => window.location.replace("/login"), 2000);
    } else {
      if (data?.error) errorMessage.textContent = data.error;
      show(errorState);
    }
  } catch {
    errorMessage.textContent = "No se pudo conectar con el servidor. Revisa tu conexión.";
    show(errorState);
  }
}

// ------------------------------------------------------------------ main
switch (page) {
  case "login":
    initLogin();
    break;
  case "register":
    initRegister();
    break;
  case "forgot":
    initForgot();
    break;
  case "reset":
    void initReset();
    break;
  case "verify-email":
    void initVerifyEmail();
    break;
}
