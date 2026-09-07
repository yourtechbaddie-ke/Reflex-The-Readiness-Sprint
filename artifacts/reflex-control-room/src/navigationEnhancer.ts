const BUTTON_CLASS = "global-back-home";

function addBackToHomeButton() {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  if (!shell || shell.querySelector(`.${BUTTON_CLASS}`)) return;

  const topActions = shell.querySelector<HTMLElement>(".top-actions");
  if (!topActions) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `secondary-button compact-button ${BUTTON_CLASS}`;
  button.setAttribute("aria-label", "Back to home");
  button.innerHTML = "← Back to Home";
  button.addEventListener("click", () => {
    window.location.reload();
  });

  topActions.insertBefore(button, topActions.firstChild);
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
