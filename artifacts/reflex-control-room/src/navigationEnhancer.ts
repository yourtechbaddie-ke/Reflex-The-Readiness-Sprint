const BUTTON_CLASS = "global-back-home";

function isDispatcherPortalScreen() {
  const avatar = document.querySelector<HTMLElement>(".top-actions .avatar");
  return avatar?.textContent?.trim() === "DI";
}

function prepareDispatcherPortalEntry() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const dispatcherButton = buttons.find((button) => button.textContent?.trim() === "Dispatcher Portal");
  if (!dispatcherButton || dispatcherButton.dataset.dispatcherEntryPrepared === "true") return;

  dispatcherButton.dataset.dispatcherEntryPrepared = "true";
  dispatcherButton.addEventListener("click", () => {
    // Every new Dispatcher Portal entry starts at its sign-in screen.
    // The authenticated workspace is reached only after successful sign-in.
    localStorage.removeItem("dispatcherToken");
  }, true);
}

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
  button.addEventListener("click", () => window.location.reload());
  shell.appendChild(button);
}

function labelDispatcherWorkspace() {
  if (!isDispatcherPortalScreen()) return;
  const kicker = document.querySelector<HTMLElement>(".topbar .kicker");
  const title = document.querySelector<HTMLElement>(".topbar h1");
  const subtitle = document.querySelector<HTMLElement>(".topbar p");
  if (kicker) kicker.textContent = "DISPATCHER PORTAL";
  if (title) title.textContent = "Dispatcher Portal";
  if (subtitle) subtitle.textContent = "Live dispatch and rider assignment workspace";
}

function observeNavigation() {
  const enhance = () => {
    prepareDispatcherPortalEntry();
    addBackToHomeButton();
    labelDispatcherWorkspace();
  };

  enhance();
  const observer = new MutationObserver(enhance);
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
