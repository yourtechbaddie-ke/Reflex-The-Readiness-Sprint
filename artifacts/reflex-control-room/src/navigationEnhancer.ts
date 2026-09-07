import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import Settings from "./Settings";

const BUTTON_CLASS = "global-back-home";
const SETTINGS_CLASS = "global-settings-entry";
let settingsRoot: Root | null = null;

function isDispatcherPortalScreen() {
  const avatar = document.querySelector<HTMLElement>(".top-actions .avatar");
  return avatar?.textContent?.trim() === "DI";
}

function prepareDispatcherPortalEntry() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const dispatcherButton = buttons.find((button) => button.textContent?.trim() === "Dispatcher Portal");
  if (!dispatcherButton || dispatcherButton.dataset.dispatcherEntryPrepared === "true") return;
  dispatcherButton.dataset.dispatcherEntryPrepared = "true";
  dispatcherButton.addEventListener("click", () => localStorage.removeItem("dispatcherToken"), true);
}

function addBackToHomeButton() {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  if (!shell || shell.querySelector(`.${BUTTON_CLASS}`)) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `secondary-button compact-button ${BUTTON_CLASS}`;
  button.setAttribute("aria-label", "Back to home");
  button.textContent = "← Back to Home";
  Object.assign(button.style, { position: "fixed", top: "18px", right: "18px", zIndex: "9999", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "42px", padding: "0 16px", borderRadius: "12px", cursor: "pointer" });
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

function addSettingsEntry() {
  if (!isDispatcherPortalScreen()) return;
  const nav = document.querySelector<HTMLElement>(".sidebar nav");
  if (!nav || nav.querySelector(`.${SETTINGS_CLASS}`)) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `nav-link ${SETTINGS_CLASS}`;
  button.innerHTML = '<span class="nav-icon"><span aria-hidden="true">⚙</span></span><span><b>Settings</b><small>Portal preferences</small></span>';
  button.addEventListener("click", () => openSettings());
  nav.appendChild(button);
}

function openSettings() {
  const main = document.querySelector<HTMLElement>(".main-content");
  const content = document.querySelector<HTMLElement>(".content-area");
  if (!main || !content) return;
  content.style.display = "none";
  const existing = main.querySelector<HTMLElement>(".settings-mount");
  const mount = existing || document.createElement("div");
  mount.className = "settings-mount";
  if (!existing) main.appendChild(mount);
  settingsRoot?.unmount();
  settingsRoot = createRoot(mount);
  settingsRoot.render(createElement(Settings, { onBack: closeSettings }));
}

function closeSettings() {
  const content = document.querySelector<HTMLElement>(".content-area");
  const mount = document.querySelector<HTMLElement>(".settings-mount");
  settingsRoot?.unmount();
  settingsRoot = null;
  mount?.remove();
  if (content) content.style.display = "";
}

function observeNavigation() {
  const enhance = () => {
    prepareDispatcherPortalEntry();
    addBackToHomeButton();
    labelDispatcherWorkspace();
    addSettingsEntry();
  };
  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observeNavigation, { once: true });
else observeNavigation();
