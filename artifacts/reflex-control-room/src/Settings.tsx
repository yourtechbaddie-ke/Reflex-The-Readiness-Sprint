import { useEffect, useState } from "react";
import API_BASE_URL from "./config/api";

type SettingsProps = { onBack: () => void };

const STORAGE_KEY = "reflexControlRoomSettings";

type Preferences = {
  deliveryAlerts: boolean;
  statusAlerts: boolean;
  browserNotifications: boolean;
  soundAlerts: boolean;
  autoRefresh: string;
  confirmAssignment: boolean;
  compactDensity: boolean;
};

const defaults: Preferences = {
  deliveryAlerts: true,
  statusAlerts: true,
  browserNotifications: false,
  soundAlerts: false,
  autoRefresh: "10",
  confirmAssignment: true,
  compactDensity: false,
};

function loadPreferences(): Preferences {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} className={`settings-toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}><span /></button>;
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="settings-row"><div><strong>{title}</strong><p>{description}</p></div>{children}</div>;
}

export default function Settings({ onBack }: SettingsProps) {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<"checking" | "connected" | "offline">("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1400);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  useEffect(() => {
    let active = true;
    async function checkHealth() {
      setHealth("checking");
      try {
        const token = localStorage.getItem("dispatcherToken");
        const response = await fetch(`${API_BASE_URL}/deliveries`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (active) setHealth(response.ok ? "connected" : "offline");
      } catch {
        if (active) setHealth("offline");
      } finally {
        if (active) setLastChecked(new Date());
      }
    }
    void checkHealth();
    const timer = window.setInterval(() => void checkHealth(), 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences((current) => ({ ...current, [key]: value }));
  const healthLabel = health === "connected" ? "Connected" : health === "offline" ? "Offline" : "Checking…";

  return <div className="settings-page">
    <div className="settings-heading">
      <div><p className="eyebrow">DISPATCHER PORTAL · PREFERENCES</p><h2>Settings</h2><p>Manage your dispatcher profile, notifications, workspace preferences and connection status.</p></div>
      <button className="secondary-button compact-button" onClick={onBack}>← Back to workspace</button>
    </div>

    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-head"><div><p className="eyebrow">PROFILE</p><h3>Dispatcher account</h3></div><span className="settings-badge">DISPATCHER</span></div>
        <div className="profile-summary"><span className="settings-avatar">DI</span><div><strong>Dispatcher</strong><p>Authenticated operations account</p></div></div>
        <div className="settings-info-list"><span><b>Role</b>Dispatcher</span><span><b>Access</b>Live delivery operations</span><span><b>Session</b>{localStorage.getItem("dispatcherToken") ? "Authenticated" : "Not authenticated"}</span></div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head"><div><p className="eyebrow">NOTIFICATIONS</p><h3>Operational alerts</h3></div></div>
        <SettingRow title="Delivery alerts" description="Notify me when deliveries need dispatch attention."><Toggle checked={preferences.deliveryAlerts} onChange={(v) => update("deliveryAlerts", v)} /></SettingRow>
        <SettingRow title="Status updates" description="Keep me informed when delivery statuses change."><Toggle checked={preferences.statusAlerts} onChange={(v) => update("statusAlerts", v)} /></SettingRow>
        <SettingRow title="Browser notifications" description="Allow Reflex to send alerts outside the active tab."><Toggle checked={preferences.browserNotifications} onChange={(v) => update("browserNotifications", v)} /></SettingRow>
        <SettingRow title="Sound alerts" description="Play an alert sound for important operational events."><Toggle checked={preferences.soundAlerts} onChange={(v) => update("soundAlerts", v)} /></SettingRow>
      </section>

      <section className="settings-card">
        <div className="settings-card-head"><div><p className="eyebrow">OPERATIONS</p><h3>Workspace preferences</h3></div></div>
        <SettingRow title="Auto-refresh" description="How often the Control Room checks for live delivery updates."><select className="settings-select" value={preferences.autoRefresh} onChange={(e) => update("autoRefresh", e.target.value)}><option value="10">Every 10 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option><option value="0">Off</option></select></SettingRow>
        <SettingRow title="Confirm rider assignment" description="Ask for confirmation before assigning a delivery to a rider."><Toggle checked={preferences.confirmAssignment} onChange={(v) => update("confirmAssignment", v)} /></SettingRow>
        <SettingRow title="Compact workspace" description="Use tighter spacing for dense operational screens."><Toggle checked={preferences.compactDensity} onChange={(v) => update("compactDensity", v)} /></SettingRow>
      </section>

      <section className="settings-card">
        <div className="settings-card-head"><div><p className="eyebrow">DISPLAY</p><h3>Control Room appearance</h3></div></div>
        <div className="theme-preview"><div className="theme-swatch theme-plum" /><div><strong>Deep Plum × Ice Blue</strong><p>Current Reflex workspace theme</p></div><span className="settings-badge">ACTIVE</span></div>
        <p className="settings-muted">The approved Reflex visual system is kept consistent across desktop and mobile. Display settings do not alter the production theme.</p>
      </section>

      <section className="settings-card settings-card-wide">
        <div className="settings-card-head"><div><p className="eyebrow">SYSTEM HEALTH</p><h3>Live connection</h3></div><span className={`health-status health-${health}`}><i />{healthLabel}</span></div>
        <div className="system-health-grid"><div><span>Environment</span><strong>Production</strong></div><div><span>API endpoint</span><strong>Same-origin /api/v1</strong></div><div><span>Last checked</span><strong>{lastChecked ? lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Checking…"}</strong></div></div>
        <p className="settings-muted">Settings never expose API tokens, backend configuration or database credentials.</p>
      </section>
    </div>

    <div className={`settings-save-note ${saved ? "visible" : ""}`}>✓ Preferences saved locally</div>
  </div>;
}
