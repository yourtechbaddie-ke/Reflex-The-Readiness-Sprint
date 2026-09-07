const BUTTON_CLASS = "global-back-home";

function addBackToHomeButton() {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  if (!shell || shell.querySelector(`.${BUTTON_CLASS}`)) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `secondary-button compact-button ${BUTTON_CLASS}`;
  button.setAttribute("aria-label", "Back to home");
  button.textContent = "← Back to Home";
  button.style.position = "fixed";
  button.style.top = "18px";
  button.style.right = "18px";
  button.style.zIndex = "9999";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.minHeight = "42px";
  button.style.padding = "0 16px";
  button.style.borderRadius = "12px";
  button.style.cursor = "pointer";

  button.addEventListener("click", () => {
    window.location.reload();
  });

  shell.appendChild(button);
}

function observeNavigation() {
  addBackToHomeButton();
  const observer = new MutationObserver(addBackToHomeButton);
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeNavigation, { once: true });
} else {
  observeNavigation();
}
