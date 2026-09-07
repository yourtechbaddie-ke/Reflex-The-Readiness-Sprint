import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import API_BASE_URL from "./config/api";

type Screen = "home" | "dashboard" | "dispatcher" | "deliveries" | "riders" | "rider-portal";
type Status = "PENDING" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";
type Rider = { id: string; name: string; phone?: string; email?: string; initials?: string; area?: string; activeDeliveries?: number; status?: string };
type Delivery = { id: string; customerName: string; customerPhone?: string; deliveryAddress?: string; address?: string; itemDescription?: string; status: Status; retailer?: { id: string; name: string }; rider?: Rider | null; riderId?: string | null; createdAt: string; updatedAt?: string };
type ApiResult<T> = { success: boolean; data?: T; error?: { message?: string; code?: string } };

const RIDER_TOKEN = "riderToken";
const DISPATCHER_TOKEN = "dispatcherToken";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const authToken = token || localStorage.getItem(DISPATCHER_TOKEN) || undefined;
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("The Reflex API could not be reached. Check the live backend connection.");
  }
  const result = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!response.ok || !result?.success || result.data === undefined) {
    const error = new Error(result?.error?.message || `Request failed (${response.status}).`);
    (error as Error & { status?: number; code?: string }).status = response.status;
    (error as Error & { status?: number; code?: string }).code = result?.error?.code;
    throw error;
  }
  return result.data;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    activity: "M3 12h4l2-7 4 14 2-7h6",
    package: "m21 8-9 5-9-5 9-5 9 5ZM3 8v8l9 5 9-5V8M12 13v8",
    users: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c.5-3 2.5-5 6-5s5.5 2 6 5M16 4a3 3 0 0 1 0 6M17 14c2 .5 3.5 2 4 5",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    menu: "M4 7h16M4 12h16M4 17h16",
    refresh: "M20 11a8 8 0 1 0 2 5m-2-5h-5m5 0V6",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.activity} /></svg>;
}

function Status({ status }: { status: string }) {
  return <span className={`status status-${status.toLowerCase()}`}><span />{status.replaceAll("_", " ")}</span>;
}

function Home({ go }: { go: (screen: Screen) => void }) {
  return <div className="home-page">
    <section className="home-hero">
      <div className="home-hero-content">
        <div className="home-brand"><div className="brand-mark">R</div><div><strong>Reflex</strong><span>Readiness &amp; Delivery Operations</span></div></div>
        <div className="home-copy">
          <p className="eyebrow">Last-mile operations platform</p>
          <h1>Move every delivery<span>with confidence.</span></h1>
          <p className="home-description">Reflex gives delivery teams one clear view of their operations — from dispatch and rider availability to delivery completion.</p>
          <div className="home-actions"><button className="primary-button home-primary" onClick={() => go("dashboard")}>Enter Control Room <span>→</span></button><button className="secondary-button home-secondary" onClick={() => go("dispatcher")}>Dispatcher Portal</button><button className="secondary-button home-secondary" onClick={() => go("rider-portal")}>Rider Portal</button></div>
        </div>
        <div className="home-meta"><span><i className="status-dot" />System operational</span><span>REFLEX SPRINT · 2026</span></div>
      </div>
      <div className="home-visual"><div className="operations-card">
        <div className="operations-card-header"><div><p>Live operations</p><strong>Control Room</strong></div><span className="live-indicator"><span className="status-dot" />Live</span></div>
        <div className="operations-metric"><span>Network performance</span><strong>98.6%</strong></div>
        <div className="operations-progress"><div className="progress-label"><span>Operational health</span><strong>Healthy</strong></div><div className="progress-track"><span style={{ width: "98.6%" }} /></div></div>
        <div className="operations-list"><div className="operation-row"><span className="operation-icon">↗</span><div><strong>Assignment desk</strong><span>Dispatch riders in real time</span></div><span className="operation-status">Live</span></div><div className="operation-row"><span className="operation-icon delivered">✓</span><div><strong>Rider portal</strong><span>Pick up and complete deliveries</span></div><span className="operation-status complete">Ready</span></div></div>
        <button className="operations-link" onClick={() => go("dashboard")}>Open operations →</button>
      </div></div>
    </section>
    <section className="home-bottom"><div className="home-feature"><span>01</span><div><strong>One operational view</strong><p>See deliveries, riders and network health in one place.</p></div></div><div className="home-feature"><span>02</span><div><strong>Real-time decisions</strong><p>Assign work quickly and keep every handoff visible.</p></div></div><div className="home-feature"><span>03</span><div><strong>Built for every role</strong><p>Dispatchers and riders get focused tools for their work.</p></div></div></section>
  </div>;
}

function Login({ onSuccess, onHome }: { onSuccess: (token: string) => void; onHome: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await request<{ token: string; user: { role: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      if (data.user.role !== "RIDER") throw new Error("This account is not authorized for the Rider Portal.");
      localStorage.setItem(RIDER_TOKEN, data.token); onSuccess(data.token);
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed."); }
    finally { setLoading(false); }
  }
  return <div className="rider-login-page"><div className="rider-login-card">
    <button className="rider-back-home" onClick={onHome}><Icon name="arrow" size={14} /> Back to home</button>
    <div className="rider-login-brand"><div className="brand-mark">R</div><div><strong>Reflex</strong><span>Rider Portal</span></div></div>
    <div className="rider-login-heading"><p className="eyebrow">Rider portal</p><h2>Welcome back.</h2><p>Sign in to view and manage your assigned deliveries.</p></div>
    <form className="rider-login-form" onSubmit={submit}>
      <label className="form-field"><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
      <label className="form-field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {error && <div className="login-error"><span>!</span>{error}</div>}
      <button className="primary-button login-button" disabled={loading}>{loading ? "Signing in..." : "Sign in"}<span>→</span></button>
    </form><p className="rider-login-footer">Reflex last-mile operations</p>
  </div></div>;
}

function DispatcherLogin({ onSuccess, onHome }: { onSuccess: (token: string) => void; onHome: () => void }) {
  const [email, setEmail] = useState("dispatcher@reflex.test");
  const [password, setPassword] = useState("Reflex123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await request<{ token: string; user: { role: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      if (data.user.role !== "DISPATCHER") throw new Error("This account is not authorized for the Dispatcher Portal.");
      localStorage.setItem(DISPATCHER_TOKEN, data.token); onSuccess(data.token);
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed."); }
    finally { setLoading(false); }
  }
  return <div className="rider-login-page"><div className="rider-login-card">
    <button className="rider-back-home" onClick={onHome}><Icon name="arrow" size={14} /> Back to home</button>
    <div className="rider-login-brand"><div className="brand-mark">R</div><div><strong>Reflex</strong><span>Dispatcher Portal</span></div></div>
    <div className="rider-login-heading"><p className="eyebrow">Dispatcher portal</p><h2>Dispatch with confidence.</h2><p>Sign in to assign live deliveries to real riders.</p></div>
    <form className="rider-login-form" onSubmit={submit}>
      <label className="form-field"><span>Email address</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></label>
      <label className="form-field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      <div className="login-demo-note"><strong>Local demo</strong><span>dispatcher@reflex.test · Reflex123!</span></div>
      {error && <div className="login-error"><span>!</span>{error}</div>}
      <button className="primary-button login-button" disabled={loading}>{loading ? "Signing in..." : "Open Dispatcher Portal"}<span>→</span></button>
    </form><p className="rider-login-footer">Reflex last-mile operations</p>
  </div></div>;
}

function RiderPortal({ onHome }: { onHome: () => void }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(RIDER_TOKEN));
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { const data = await request<{ deliveries: Delivery[] }>("/deliveries", {}, token); setDeliveries(data.deliveries || []); }
    catch (e) { const err = e as Error & { status?: number }; if (err.status === 401 || err.status === 403) { localStorage.removeItem(RIDER_TOKEN); setToken(null); } setError(e instanceof Error ? e.message : "Could not load deliveries."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function advance(d: Delivery) {
    if (!token) return;
    const next: Status = d.status === "ASSIGNED" ? "PICKED_UP" : "DELIVERED";
    setAction(d.id); setError("");
    try { await request(`/deliveries/${d.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) }, token); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update status."); }
    finally { setAction(null); }
  }
  if (!token) return <Login onSuccess={setToken} onHome={onHome} />;
  const active = deliveries.filter(d => d.status === "ASSIGNED" || d.status === "PICKED_UP").length;
  const completed = deliveries.filter(d => d.status === "DELIVERED").length;
  return <div className="rider-page">
    <button className="rider-back-home rider-back-home-light" onClick={onHome}><Icon name="arrow" size={14} /> Back to home</button>
    <div className="page-intro"><div><p className="eyebrow">Rider portal</p><h2>My Deliveries</h2><p>Stay on top of deliveries currently assigned to you.</p></div><div className="rider-header-actions"><div className="rider-online"><span className="status-dot" />Online</div><button className="secondary-button compact-button" onClick={() => { localStorage.removeItem(RIDER_TOKEN); setToken(null); setDeliveries([]); }}>Sign out</button></div></div>
    <div className="mini-stats rider-stats"><div className="mini-stat"><span>Total deliveries</span><strong>{deliveries.length}</strong></div><div className="mini-stat"><span>Active</span><strong>{active}</strong></div><div className="mini-stat success"><span>Completed</span><strong>{completed}</strong></div></div>
    {error && <div className="error-state rider-error"><strong>Delivery update issue</strong><span>{error}</span><button className="secondary-button" onClick={() => void load()}>Try again</button></div>}
    {loading ? <div className="loading-state"><span className="loading-spinner" /> Loading your deliveries...</div> : <section className="panel"><div className="panel-header"><div><p className="eyebrow">Your queue</p><h3>Assigned deliveries</h3><p className="panel-subtitle">Follow the sequence: Picked Up → Delivered.</p></div><span className="panel-count">{deliveries.length} deliveries</span></div>
      {deliveries.length === 0 ? <div className="empty-state rider-empty"><div className="empty-icon">✓</div><strong>You&apos;re all caught up</strong><p>There are no deliveries assigned to you right now.</p></div> : <div className="rider-delivery-list">{deliveries.map(d => <article className="rider-delivery-card" key={d.id}><div className="rider-delivery-main"><div className="rider-delivery-icon">{d.status === "DELIVERED" ? "✓" : "↗"}</div><div className="rider-delivery-info"><div className="rider-delivery-title"><strong>{d.itemDescription || "Delivery"}</strong><span className="delivery-id">{d.id}</span></div><div className="rider-delivery-meta"><span><b>Destination</b>{d.deliveryAddress || d.address || "—"}</span><span><b>Retailer</b>{d.retailer?.name || "Reflex"}</span></div></div></div><div className="rider-delivery-actions"><Status status={d.status} />{(d.status === "ASSIGNED" || d.status === "PICKED_UP") && <button className="primary-button compact-button" disabled={action === d.id} onClick={() => void advance(d)}>{action === d.id ? "Saving..." : d.status === "ASSIGNED" ? "Picked Up" : "Delivered"}<span>→</span></button>}</div></article>)}</div>}
    </section>}
  </div>;
}

// The general Control Room intentionally excludes the Dispatcher Assignment Desk.
// Assignment Desk remains available only after authenticated entry through Dispatcher Portal.
const navItems = [["dashboard", "Overview", "Network pulse", "grid"], ["deliveries", "Deliveries", "Live register", "package"], ["riders", "Riders", "Fleet readiness", "users"]] as const;

function ControlRoom({ screen, go }: { screen: Exclude<Screen, "home" | "rider-portal">; go: (s: Screen) => void }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [riderId, setRiderId] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.allSettled([
        request<{ deliveries: Delivery[] }>("/deliveries"),
        request<{ riders: Rider[] }>("/riders"),
      ]);
      const deliveryResult = results[0];
      const riderResult = results[1];
      if (deliveryResult.status === "fulfilled") setDeliveries(deliveryResult.value.deliveries || []);
      if (riderResult.status === "fulfilled") setRiders(riderResult.value.riders || []);
      if (deliveryResult.status === "fulfilled" || riderResult.status === "fulfilled") setLastSynced(new Date());
      const failures = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length) setError(failures.map(f => f.reason instanceof Error ? f.reason.message : "Live data request failed.").join(" "));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 10000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3500); return () => window.clearTimeout(timer); }, [notice]);

  async function assign() {
    if (!selected || !riderId) return;
    setError(""); setNotice("");
    try {
      await request(`/deliveries/${selected}/assign`, { method: "PATCH", body: JSON.stringify({ riderId }) });
      setNotice("Rider assigned successfully."); setRiderId(""); setSelected(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "The rider could not be assigned."); }
  }

  const filtered = useMemo(() => deliveries.filter(d => `${d.id} ${d.customerName} ${d.deliveryAddress || d.address || ""} ${d.rider?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [deliveries, query]);
  const pending = deliveries.filter(d => d.status === "PENDING").length;
  const active = deliveries.filter(d => d.status === "ASSIGNED" || d.status === "PICKED_UP").length;
  const inTransit = deliveries.filter(d => d.status === "PICKED_UP").length;
  const done = deliveries.filter(d => d.status === "DELIVERED").length;
  const deliveredToday = deliveries.filter(d => {
    if (d.status !== "DELIVERED") return false;
    const timestamp = d.updatedAt || d.createdAt;
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }).length;
  const available = riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").length;
  const navigate = (next: Screen) => { setMobileNav(false); go(next); };
  const syncLabel = !lastSynced ? "Waiting for live data" : `Updated ${Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 1000)) < 10 ? "just now" : `${Math.round((Date.now() - lastSynced.getTime()) / 60)}m ago`}`;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <button className="brand" onClick={() => navigate("dashboard")}><span className="brand-mark">R</span><span><b>Reflex</b><small>Control room</small></span></button>
      <div className="sidebar-rule" />
      <nav><small className="nav-heading">WORKSPACE</small>{navItems.map(([id, label, desc, icon]) => <button key={id} className={`nav-link ${screen === id ? "active" : ""}`} onClick={() => navigate(id)}><span className="nav-icon"><Icon name={icon} /></span><span><b>{label}</b><small>{desc}</small></span></button>)}</nav>
      <div className="sidebar-bottom"><div className="insight"><span>Today&apos;s target</span><b>92% on-time</b></div><div className="system"><i className="live-dot" /><span><b>System operational</b><small>Live network</small></span></div><footer>REFLEX SPRINT <span>v1.0</span></footer></div>
    </aside>
    {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-content">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu" onClick={() => setMobileNav(v => !v)} aria-label="Open navigation"><Icon name="menu" /></button><div><span className="kicker">OPERATIONS WORKSPACE</span><h1>Control room</h1><p>Live last-mile delivery operations</p></div></div><div className="top-actions"><span className="connection"><i className="live-dot" />Live</span><span className="avatar">{screen === "dispatcher" ? "DI" : "CO"}</span><b>{screen === "dispatcher" ? "Dispatcher" : "Control Room"}</b>{screen === "dispatcher" && <button className="secondary-button compact-button" onClick={() => { localStorage.removeItem(DISPATCHER_TOKEN); go("home"); }}>Sign out</button>}</div></header>
      <div className="content-area">
        {notice && <div className="toast"><Icon name="check" size={15} />{notice}</div>}
        {error && <div className="error-state live-data-error"><strong>Live API issue</strong><span>{error}</span><button className="secondary-button" onClick={() => void load()}>Try again</button></div>}
        {loading && <div className="sync-indicator"><span className="loading-spinner" />Syncing live data…</div>}

        {screen === "dashboard" && <>
          <div className="page-intro"><div><p className="eyebrow">LIVE OPERATIONS · SYNTHETIC WORKSPACE</p><h2>Good afternoon, Control Room.</h2><p>Here&apos;s the pulse of your delivery network right now.</p></div><div className="dashboard-live-meta"><span className="health-pill"><i className="live-dot" />Network healthy</span><span className="sync-copy">{syncLabel}</span></div></div>
          <section className="metrics-grid">
            <Metric label="Active deliveries" value={active} detail="Live from the dispatch queue" tone="live" />
            <Metric label="In transit" value={inTransit} detail="Currently moving" tone="live" />
            <Metric label="Delivered today" value={deliveredToday} detail="Completed in this workspace" tone="live" />
            <Metric label="Needs attention" value={pending} detail={`${pending} unassigned or waiting for dispatch`} tone="review" />
          </section>
          <section className="dashboard-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE ACTIVITY</p><h3>Recent operations</h3><p>The latest movement across the network.</p></div><button className="icon-button" onClick={() => void load()} aria-label="Refresh"><Icon name="refresh" size={15} /></button></div>{deliveries.length === 0 ? <div className="empty-state"><strong>No deliveries yet</strong><p>New deliveries will appear here automatically.</p></div> : deliveries.slice(0, 6).map(d => <div className="activity-row" key={d.id}><span className="activity-marker" /><div><b>{d.customerName}</b><p>{d.deliveryAddress || d.address || "No destination"} · {d.status.replaceAll("_", " ")}</p></div><small>{d.id}</small></div>)}</section><section className="panel health-panel"><div className="panel-head"><div><p className="eyebrow">NETWORK HEALTH</p><h3>System performance</h3></div></div><div className="health-ring"><strong>LIVE</strong><span>Network healthy</span></div><div className="health-lines"><span>Active deliveries <b>{active}</b></span><span>In transit <b>{inTransit}</b></span><span>Unassigned <b>{pending}</b></span><span>Delivered today <b>{deliveredToday}</b></span><span>Riders available <b>{available}</b></span></div></section></section>
        </>}

        {screen === "dispatcher" && <>
          <div className="page-intro"><div><p className="eyebrow">DISPATCH WORKSPACE · AUTHENTICATED</p><h2>Assignment desk</h2><p>Match open deliveries with an available rider using live database IDs.</p></div></div>
          <div className="mini-stats"><div className="mini-stat warning"><span>Pending</span><strong>{pending}</strong><small>Need a rider</small></div><div className="mini-stat success"><span>Active</span><strong>{active}</strong><small>In motion</small></div><div className="mini-stat"><span>Available riders</span><strong>{available}</strong><small>Ready to move</small></div></div>
          <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">DISPATCH QUEUE</p><h3>Open deliveries</h3></div></div>{deliveries.filter(d => d.status === "PENDING").map(d => <button className={`dispatch-row ${selected === d.id ? "selected" : ""}`} key={d.id} onClick={() => { setSelected(d.id); setRiderId(""); }}><span className="priority-dot">!</span><span><b>{d.id}</b><p>{d.customerName} · {d.deliveryAddress || d.address || "No destination"}</p></span><Status status={d.status} /></button>)}{pending === 0 && <div className="empty-state"><strong>No pending deliveries</strong><p>New pending deliveries will appear here when retailers create them.</p></div>}</section>
          <section className="panel assignment-panel"><div className="panel-head"><div><p className="eyebrow">ASSIGNMENT ACTION</p><h3>{selected || "Select a delivery"}</h3></div></div>{selected ? <><p className="panel-subtitle">Choose an available rider using the real database rider ID.</p><label className="select-label">Available rider<select value={riderId} onChange={e => setRiderId(e.target.value)}><option value="">Choose a rider</option>{riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").map(r => <option value={r.id} key={r.id}>{r.name} · {r.id}</option>)}</select></label>{riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").length === 0 && <div className="inline-warning">No riders are currently available.</div>}<button className="primary-button dispatch-assign-button" disabled={!riderId} onClick={() => void assign()}>Assign rider <Icon name="arrow" size={14} /></button></> : <div className="empty-state"><strong>Select an open delivery</strong><p>Then choose an available rider.</p></div>}</section></div>
        </>}

        {screen === "deliveries" && <section className="panel"><div className="panel-header"><div><p className="eyebrow">LIVE REGISTER</p><h3>All deliveries</h3><p className="panel-subtitle">{filtered.length} matching record{filtered.length === 1 ? "" : "s"}.</p></div><input className="search" placeholder="Search deliveries..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Customer</th><th>Destination</th><th>Rider</th><th>Status</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id}><td><b>{d.id}</b></td><td>{d.customerName}</td><td>{d.deliveryAddress || d.address || "—"}</td><td>{d.rider?.name || "Unassigned"}</td><td><Status status={d.status} /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><strong>No matching deliveries</strong><p>Try a different customer, destination or delivery ID.</p></div>}</div></section>}

        {screen === "riders" && <section className="panel"><div className="panel-header"><div><p className="eyebrow">FLEET READINESS</p><h3>Rider roster</h3><p className="panel-subtitle">{riders.length} rider{riders.length === 1 ? "" : "s"} in the live roster.</p></div><button className="secondary-button compact-button" onClick={() => void load()}><Icon name="refresh" size={14} /> Refresh</button></div><div className="rider-list">{riders.length === 0 ? <div className="empty-state"><strong>No riders returned</strong><p>Check that the configured rider account exists in the backend database.</p></div> : riders.map(r => <div className="rider-row" key={r.id}><span className="rider-avatar">{r.initials || r.name.slice(0, 2).toUpperCase()}</span><div><b>{r.name}</b><small>{r.email || r.id}</small></div><span className="rider-zone">{r.area || "Nairobi"}</span><strong>{r.activeDeliveries || 0}</strong><Status status={r.status || "AVAILABLE"} /></div>)}</div></section>}
      </div>
    </main>
  </div>;
}

function Metric({ label, value, detail, tone = "live" }: { label: string; value: number; detail: string; tone?: "live" | "review" }) {
  return <div className={`metric metric-${tone}`}><div className="metric-top"><span><Icon name="package" size={14} /></span><small>{tone === "review" ? "Review" : "Live"}</small></div><label>{label}</label><strong>{value}</strong><em>{detail}</em></div>;
}

function DispatcherPortal({ onHome }: { onHome: () => void }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(DISPATCHER_TOKEN));
  if (!token) return <DispatcherLogin onSuccess={setToken} onHome={onHome} />;
  return <ControlRoom screen="dispatcher" go={(next) => { if (next === "dispatcher") { setToken(localStorage.getItem(DISPATCHER_TOKEN)); return; } onHome(); }} />;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  if (screen === "home") return <Home go={setScreen} />;
  if (screen === "rider-portal") return <RiderPortal onHome={() => setScreen("home")} />;
  if (screen === "dispatcher") return <DispatcherPortal onHome={() => setScreen("home")} />;
  return <ControlRoom screen={screen} go={setScreen} />;
}