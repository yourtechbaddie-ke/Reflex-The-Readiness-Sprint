import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import API_BASE_URL from "./config/api";

type Screen = "home" | "dashboard" | "dispatcher" | "deliveries" | "riders" | "rider-portal";
type Status = "PENDING" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";
type Rider = { id: string; name: string; phone?: string; email?: string; initials?: string; area?: string; activeDeliveries?: number; status?: string };
type Delivery = { id: string; customerName: string; customerPhone?: string; deliveryAddress?: string; address?: string; itemDescription?: string; status: Status; retailer?: { id: string; name: string }; rider?: Rider | null; riderId?: string | null; createdAt: string; updatedAt?: string };
type ApiResult<T> = { success: boolean; data?: T; error?: { message?: string; code?: string } };

const RIDER_TOKEN = "riderToken";

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
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
          <div className="home-actions"><button className="primary-button home-primary" onClick={() => go("dashboard")}>Enter Control Room <span>→</span></button><button className="secondary-button home-secondary" onClick={() => go("rider-portal")}>Rider Portal</button></div>
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

const navItems = [["dashboard", "Overview", "Network pulse", "grid"], ["dispatcher", "Dispatcher", "Assignment desk", "activity"], ["deliveries", "Deliveries", "Live register", "package"], ["riders", "Riders", "Fleet readiness", "users"]] as const;

function ControlRoom({ screen, go }: { screen: Exclude<Screen, "home" | "rider-portal">; go: (s: Screen) => void }) {
  // IMPORTANT: the Control Room is intentionally public. The Render server proxies
  // dispatcher API requests and supplies the dispatcher credential server-side.
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [riderId, setRiderId] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const results = await Promise.allSettled([
        request<{ deliveries: Delivery[] }>("/deliveries"),
        request<{ riders: Rider[] }>("/riders"),
      ]);
      if (results[0].status === "fulfilled") setDeliveries(results[0].value.deliveries || []);
      if (results[1].status === "fulfilled") setRiders(results[1].value.riders || []);
      const failures = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length) setError(failures.map(f => f.reason instanceof Error ? f.reason.message : "Live data request failed.").join(" "));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [load]);
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
  const done = deliveries.filter(d => d.status === "DELIVERED").length;
  const available = riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").length;
  const navigate = (next: Screen) => { setMobileNav(false); go(next); };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <button className="brand" onClick={() => navigate("dashboard")}><span className="brand-mark">R</span><span><b>Reflex</b><small>Control room</small></span></button>
      <div className="sidebar-rule" />
      <nav><small className="nav-heading">WORKSPACE</small>{navItems.map(([id, label, desc, icon]) => <button key={id} className={`nav-link ${screen === id ? "active" : ""}`} onClick={() => navigate(id)}><span className="nav-icon"><Icon name={icon} /></span><span><b>{label}</b><small>{desc}</small></span></button>)}</nav>
      <div className="sidebar-bottom"><div className="insight"><span>Today&apos;s target</span><b>92% on-time</b></div><div className="system"><i className="live-dot" /><span><b>System operational</b><small>Live network</small></span></div><footer>REFLEX SPRINT <span>v1.0</span></footer></div>
    </aside>
    {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <main className="main-content">
      <header className="topbar"><div className="topbar-title"><button className="mobile-menu" onClick={() => setMobileNav(v => !v)} aria-label="Open navigation"><Icon name="menu" /></button><div><span className="kicker">OPERATIONS WORKSPACE</span><h1>{screen[0].toUpperCase() + screen.slice(1)}</h1><p>Live last-mile delivery operations</p></div></div><div className="top-actions"><span className="connection"><i className="live-dot" />System operational</span><span className="avatar">CO</span><b>Control Room</b></div></header>
      <div className="content-area">
        {notice && <div className="toast"><Icon name="check" size={15} />{notice}</div>}
        {error && <div className="error-state live-data-error"><strong>Live API issue</strong><span>{error}</span><button className="secondary-button" onClick={() => void load()}>Try again</button></div>}
        {loading && <div className="sync-indicator"><span className="loading-spinner" />Syncing live data…</div>}

        {screen === "dashboard" && <>
          <div className="page-intro"><div><span className="eyebrow">LIVE OPERATIONS · DATABASE</span><h2>Good afternoon, Control Room.</h2><p>Here&apos;s the pulse of your delivery network right now.</p></div><span className="health-pill"><i className="live-dot" />Network healthy</span></div>
          <section className="metrics-grid"><Metric label="Total deliveries" value={deliveries.length} detail="Live records" /><Metric label="Active deliveries" value={active} detail="Assigned or picked up" /><Metric label="Delivered" value={done} detail="Completed" /><Metric label="Needs attention" value={pending} detail="Waiting for dispatch" /></section>
          <section className="dashboard-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE ACTIVITY</p><h3>Recent operations</h3><p>The latest movement across the network.</p></div><button className="icon-button" onClick={() => void load()} aria-label="Refresh"><Icon name="refresh" size={15} /></button></div>{deliveries.length === 0 ? <div className="empty-state"><strong>No deliveries yet</strong><p>New deliveries will appear here automatically.</p></div> : deliveries.slice(0, 6).map(d => <div className="activity-row" key={d.id}><span className="activity-marker" /><div><b>{d.customerName}</b><p>{d.deliveryAddress || d.address || "No destination"} · {d.status.replaceAll("_", " ")}</p></div><small>{d.id}</small></div>)}</section><section className="panel health-panel"><div className="panel-head"><div><p className="eyebrow">NETWORK HEALTH</p><h3>System performance</h3></div></div><div className="health-ring"><strong>98.6%</strong><span>Healthy</span></div><div className="health-lines"><span>Active queue <b>{active}</b></span><span>Riders available <b>{available}</b></span><span>Pending dispatch <b>{pending}</b></span></div></section></section>
        </>}

        {screen === "dispatcher" && <>
          <div className="page-intro"><div><p className="eyebrow">DISPATCH WORKSPACE</p><h2>Assignment desk</h2><p>Match open deliveries with an available rider.</p></div></div>
          <div className="mini-stats"><div className="mini-stat warning"><span>Pending</span><strong>{pending}</strong><small>Need a rider</small></div><div className="mini-stat success"><span>Active</span><strong>{active}</strong><small>In motion</small></div><div className="mini-stat"><span>Available riders</span><strong>{available}</strong><small>Ready to move</small></div></div>
          <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">DISPATCH QUEUE</p><h3>Open deliveries</h3></div></div>{deliveries.filter(d => d.status === "PENDING").map(d => <button className={`dispatch-row ${selected === d.id ? "selected" : ""}`} key={d.id} onClick={() => { setSelected(d.id); setRiderId(""); }}><span className="priority-dot">!</span><span><b>{d.id}</b><p>{d.customerName} · {d.deliveryAddress || d.address || "No destination"}</p></span><Status status={d.status} /></button>)}{pending === 0 && <div className="empty-state"><strong>No pending deliveries</strong><p>New pending deliveries will appear here when retailers create them.</p></div>}</section>
          <section className="panel assignment-panel"><div className="panel-head"><div><p className="eyebrow">ASSIGNMENT ACTION</p><h3>{selected || "Select a delivery"}</h3></div></div>{selected ? <><p className="panel-subtitle">Choose an available rider using the real database rider ID.</p><label className="select-label">Available rider<select value={riderId} onChange={e => setRiderId(e.target.value)}><option value="">Choose a rider</option>{riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").map(r => <option value={r.id} key={r.id}>{r.name} · {r.id}</option>)}</select></label>{riders.filter(r => String(r.status || "").toUpperCase() === "AVAILABLE").length === 0 && <div className="inline-warning">No riders are currently available.</div>}<button className="primary-button dispatch-assign-button" disabled={!riderId} onClick={() => void assign()}>Assign rider <Icon name="arrow" size={14} /></button></> : <div className="empty-state"><strong>Select an open delivery</strong><p>Then choose an available rider.</p></div>}</section></div>
        </>}

        {screen === "deliveries" && <section className="panel"><div className="panel-header"><div><p className="eyebrow">LIVE REGISTER</p><h3>All deliveries</h3><p className="panel-subtitle">{filtered.length} matching record{filtered.length === 1 ? "" : "s"}.</p></div><input className="search" placeholder="Search deliveries..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Customer</th><th>Destination</th><th>Rider</th><th>Status</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id}><td><b>{d.id}</b></td><td>{d.customerName}</td><td>{d.deliveryAddress || d.address || "—"}</td><td>{d.rider?.name || "Unassigned"}</td><td><Status status={d.status} /></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state"><strong>No matching deliveries</strong><p>Try a different customer, destination or delivery ID.</p></div>}</div></section>}

        {screen === "riders" && <section className="panel"><div className="panel-header"><div><p className="eyebrow">FLEET READINESS</p><h3>Rider roster</h3><p className="panel-subtitle">{riders.length} rider{riders.length === 1 ? "" : "s"} in the live roster.</p></div><button className="secondary-button compact-button" onClick={() => void load()}><Icon name="refresh" size={14} /> Refresh</button></div><div className="rider-list">{riders.length === 0 ? <div className="empty-state"><strong>No riders returned</strong><p>Check that rider accounts exist in the backend database.</p></div> : riders.map(r => <div className="rider-row" key={r.id}><span className="rider-avatar">{r.initials || r.name.slice(0, 2).toUpperCase()}</span><div><b>{r.name}</b><small>{r.email || r.id}</small></div><span className="rider-zone">{r.area || "Nairobi"}</span><strong>{r.activeDeliveries || 0}</strong><Status status={r.status || "AVAILABLE"} /></div>)}</div></section>}
      </div>
    </main>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="metric metric-lavender"><div className="metric-top"><span><Icon name="package" size={14} /></span><small>Live</small></div><label>{label}</label><strong>{value}</strong><em>{detail}</em></div>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  if (screen === "home") return <Home go={setScreen} />;
  if (screen === "rider-portal") return <RiderPortal onHome={() => setScreen("home")} />;
  return <ControlRoom screen={screen} go={setScreen} />;
}
