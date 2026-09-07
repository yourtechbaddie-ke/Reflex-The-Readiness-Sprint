import { useEffect, useMemo, useState } from "react";
import type { Delivery, DeliveryItem, DeliveryStatus, Rider } from "./types/delivery";
import API_BASE_URL from "./config/api";

type Screen = "dashboard" | "dispatcher" | "deliveries" | "riders";

const fallbackDeliveries: Delivery[] = [
  { id: "DLV-1048", customerName: "Amara Wanjiku", address: "Westlands, Nairobi", status: "IN_TRANSIT", riderId: "R-03", rider: { id: "R-03", name: "Daniel Mwangi", area: "Westlands", status: "ASSIGNED" }, items: [{ id: "1", name: "Fashion order", quantity: 2 }], createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "DLV-1047", customerName: "Nadia Hassan", address: "Kilimani, Nairobi", status: "ASSIGNED", riderId: "R-01", rider: { id: "R-01", name: "Aisha Noor", area: "Kilimani", status: "ASSIGNED" }, items: [{ id: "2", name: "Home essentials", quantity: 1 }], createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "DLV-1046", customerName: "Brian Otieno", address: "Lavington, Nairobi", status: "DELIVERED", riderId: "R-02", rider: { id: "R-02", name: "Kevin Ouma", area: "Lavington", status: "AVAILABLE" }, items: [{ id: "3", name: "Electronics", quantity: 1 }], createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: "DLV-1045", customerName: "Sofia Chen", address: "Karen, Nairobi", status: "REQUESTED", items: [{ id: "4", name: "Beauty order", quantity: 3 }], createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: "DLV-1044", customerName: "Ethan Miller", address: "Parklands, Nairobi", status: "FAILED", items: [{ id: "5", name: "Gift package", quantity: 1 }], createdAt: new Date(Date.now() - 18000000).toISOString() },
];

const fallbackRiders: Rider[] = [
  { id: "R-01", name: "Aisha Noor", initials: "AN", area: "Kilimani", activeDeliveries: 1, status: "ASSIGNED" },
  { id: "R-02", name: "Kevin Ouma", initials: "KO", area: "Lavington", activeDeliveries: 0, status: "AVAILABLE" },
  { id: "R-03", name: "Daniel Mwangi", initials: "DM", area: "Westlands", activeDeliveries: 1, status: "ASSIGNED" },
  { id: "R-04", name: "Grace Njeri", initials: "GN", area: "Kileleshwa", activeDeliveries: 0, status: "AVAILABLE" },
  { id: "R-05", name: "Sam Taylor", initials: "ST", area: "Karen", activeDeliveries: 0, status: "OFFLINE" },
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) throw new Error(body?.error?.message || "The live operations API is unavailable.");
  return body.data as T;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    activity: "M3 12h4l2-7 4 14 2-7h6",
    package: "m21 8-9 5-9-5 9-5 9 5ZM3 8v8l9 5 9-5V8M12 13v8",
    users: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c.5-3 2.5-5 6-5s5.5 2 6 5M16 4a3 3 0 0 1 0 6M17 14c2 .5 3.5 2 4 5",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    search: "m20 20-4.5-4.5M10.8 17a6.2 6.2 0 1 0 0-12.4 6.2 6.2 0 0 0 0 12.4Z",
    plus: "M12 5v14M5 12h14",
    close: "M6 6l12 12M18 6 6 18",
    check: "m5 12 4 4L19 6",
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    menu: "M4 7h16M4 12h16M4 17h16",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.activity} /></svg>;
}

function Status({ status }: { status: DeliveryStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><span />{status.replace("_", " ")}</span>;
}

function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [deliveries, setDeliveries] = useState<Delivery[]>(fallbackDeliveries);
  const [riders, setRiders] = useState<Rider[]>(fallbackRiders);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeliveryStatus>("ALL");
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [apiOnline, setApiOnline] = useState(true);

  const load = async () => {
    try {
      const [deliveryData, riderData] = await Promise.all([
        api<{ deliveries: Delivery[] }>("/deliveries"),
        api<{ riders: Rider[] }>("/riders"),
      ]);
      setDeliveries(deliveryData.deliveries || []);
      setRiders(riderData.riders || []);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => deliveries.filter((d) => {
    const text = `${d.id} ${d.customerName} ${d.address} ${d.rider?.name || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "ALL" || d.status === statusFilter);
  }), [deliveries, query, statusFilter]);

  const active = deliveries.filter((d) => ["ASSIGNED", "IN_TRANSIT"].includes(d.status)).length;
  const delivered = deliveries.filter((d) => d.status === "DELIVERED").length;
  const attention = deliveries.filter((d) => ["REQUESTED", "FAILED"].includes(d.status)).length;
  const available = riders.filter((r) => r.status === "AVAILABLE").length;

  async function updateStatus(id: string, status: DeliveryStatus) {
    try {
      const data = await api<{ delivery: Delivery }>(`/deliveries/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setDeliveries((all) => all.map((d) => d.id === id ? data.delivery : d));
      setSelected(data.delivery);
      setNotice("Delivery status updated in the live operations store.");
    } catch {
      setDeliveries((all) => all.map((d) => d.id === id ? { ...d, status } : d));
      setSelected((d) => d?.id === id ? { ...d, status } : d);
      setNotice("Status updated locally. The API is currently unavailable.");
      setApiOnline(false);
    }
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function assign(deliveryId: string, riderId: string) {
    try {
      const data = await api<{ delivery: Delivery }>(`/deliveries/${deliveryId}/assign`, { method: "PATCH", body: JSON.stringify({ riderId }) });
      setDeliveries((all) => all.map((d) => d.id === deliveryId ? data.delivery : d));
      setSelected(data.delivery);
      setNotice("Rider assigned successfully.");
      await load();
    } catch {
      const rider = riders.find((r) => r.id === riderId);
      if (rider) setDeliveries((all) => all.map((d) => d.id === deliveryId ? { ...d, riderId, rider, status: d.status === "REQUESTED" ? "ASSIGNED" : d.status } : d));
      setNotice("Assignment saved locally. The API is currently unavailable.");
      setApiOnline(false);
    }
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function createDelivery(customerName: string, address: string, itemName: string, quantity: number) {
    const items: DeliveryItem[] = [{ id: `item-${Date.now()}`, name: itemName, quantity }];
    try {
      const data = await api<{ delivery: Delivery }>("/deliveries", { method: "POST", body: JSON.stringify({ customerName, address, items }) });
      setDeliveries((all) => [data.delivery, ...all]);
      setNotice("New delivery created successfully.");
    } catch {
      const local: Delivery = { id: `DLV-${Math.floor(1000 + Math.random() * 8999)}`, customerName, address, status: "REQUESTED", items, createdAt: new Date().toISOString() };
      setDeliveries((all) => [local, ...all]);
      setNotice("Delivery created in demo mode while the API is unavailable.");
      setApiOnline(false);
    }
    setModal(false);
    window.setTimeout(() => setNotice(""), 3500);
  }

  const titles: Record<Screen, [string, string]> = {
    dashboard: ["Control room", "Live last-mile delivery operations"],
    dispatcher: ["Dispatcher", "Coordinate rider assignments and delivery handoffs"],
    deliveries: ["Deliveries", "Monitor and manage delivery activity"],
    riders: ["Riders", "Monitor fleet availability and assignments"],
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setScreen("dashboard")}><span className="brand-mark">R</span><span><b>Reflex</b><small>Control room</small></span></button>
      <div className="sidebar-rule" />
      <nav><small className="nav-heading">WORKSPACE</small>
        {(["dashboard", "dispatcher", "deliveries", "riders"] as Screen[]).map((id) => <button key={id} className={`nav-link ${screen === id ? "active" : ""}`} onClick={() => setScreen(id)}><span className="nav-icon"><Icon name={id === "dashboard" ? "grid" : id === "dispatcher" ? "activity" : id === "deliveries" ? "package" : "users"} /></span><span><b>{id === "dashboard" ? "Overview" : id[0].toUpperCase() + id.slice(1)}</b><small>{id === "dashboard" ? "Network pulse" : id === "dispatcher" ? "Assignment desk" : id === "deliveries" ? "Live register" : "Fleet readiness"}</small></span></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="insight"><span>Today's target</span><b>92% on-time</b></div><div className="system"><i className="live-dot" /> <span><b>System operational</b><small>{apiOnline ? "Live network" : "Demo fallback active"}</small></span></div><footer>REFLEX SPRINT <span>v1.0</span></footer></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><span className="kicker">OPERATIONS WORKSPACE</span><h1>{titles[screen][0]}</h1><p>{titles[screen][1]}</p></div><div className="top-actions"><span className="connection"><i className={`live-dot ${apiOnline ? "" : "offline"}`} />{apiOnline ? "System operational" : "Demo data"}</span><span className="avatar">CO</span><b>Control Room</b></div></header>

      <div className="content-area">
        {notice && <div className="toast"><Icon name="check" size={15} />{notice}</div>}

        {screen === "dashboard" && <>
          <section className="page-intro"><div><span className="eyebrow">LIVE OPERATIONS · SYNTHETIC WORKSPACE</span><h2>Good afternoon, Control Room.</h2><p>Here&apos;s the pulse of your delivery network right now.</p></div><span className="health-pill"><i className={`live-dot ${apiOnline ? "" : "offline"}`} />{apiOnline ? "Network healthy" : "Demo mode"}</span></section>
          <section className="metrics-grid">
            <Metric label="Total deliveries" value={deliveries.length} detail="Live records" trend="Today" icon="package" tone="plum" />
            <Metric label="Active deliveries" value={active} detail="Moving in network" trend="Live" icon="activity" tone="lavender" />
            <Metric label="Delivered" value={delivered} detail="Completed today" trend="On track" icon="check" tone="success" />
            <Metric label="Needs attention" value={attention} detail="Requires action" trend="Review" icon="activity" tone="blush" />
          </section>
          <section className="priority"><div className="priority-icon"><Icon name="activity" /></div><div><b>Operations are moving smoothly</b><p>Delivery performance is calculated from the live operations store.</p></div><div className="priority-bar"><span style={{ width: `${Math.min(100, deliveries.length ? Math.round((delivered / deliveries.length) * 100) : 92)}%` }} /></div><strong>92%</strong><button onClick={() => setScreen("deliveries")}>Open register <Icon name="arrow" size={14} /></button></section>
          <div className="dashboard-grid"><section className="panel"><PanelHead eyebrow="LIVE ACTIVITY" title="Recent operations" note="The latest movement across the network." /><div className="activity-list">{deliveries.slice(0, 5).map((d) => <div className="activity-row" key={d.id}><span className="activity-marker" /><div><b>{d.customerName}</b><p>{d.address} · {d.status.replace("_", " ")}</p></div><small>{d.id}</small></div>)}</div><button className="text-button" onClick={() => setScreen("deliveries")}>View all activity <Icon name="arrow" size={13} /></button></section><section className="panel health-panel"><PanelHead eyebrow="NETWORK HEALTH" title="System performance" note="Current operating indicators." /><div className="health-ring"><strong>92%</strong><span>Healthy</span></div><div className="health-lines"><span>Delivery success <b>92%</b></span><span>Rider availability <b>{riders.length ? Math.round((available / riders.length) * 100) : 80}%</b></span><span>Response time <b>&lt; 240ms</b></span></div></section></div>
          <section className="panel attention"><PanelHead eyebrow="NEEDS ATTENTION" title="Operational queue" note="Items that may require intervention." /><div className="attention-grid"><div><b>Open assignments</b><p>Unassigned deliveries are waiting for dispatch.</p><button onClick={() => setScreen("dispatcher")}>Dispatch</button></div><div><b>Review the register</b><p>Keep an eye on delivery exceptions and status changes.</p><button onClick={() => setScreen("deliveries")}>Review</button></div></div></section>
        </>}

        {screen === "deliveries" && <><PageIntro title="Delivery register" text="Search, inspect and update live delivery activity." action={() => setModal(true)} /><div className="mini-stats"><Mini label="Total deliveries" value={deliveries.length} /><Mini label="Active" value={active} /><Mini label="Delivered" value={delivered} tone="success" /><Mini label="Attention" value={attention} tone="warning" /></div><section className="panel"><PanelHead eyebrow="LIVE REGISTER" title="All deliveries" note={`${filtered.length} of ${deliveries.length} records showing`} /><div className="toolbar"><label className="search"><Icon name="search" size={16} /><input placeholder="Search ID, customer, location or rider" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | DeliveryStatus)}><option value="ALL">All statuses</option>{["REQUESTED","ASSIGNED","IN_TRANSIT","DELIVERED","FAILED","CANCELLED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></div><div className="table-wrap"><table><thead><tr><th>Delivery</th><th>Customer</th><th>Destination</th><th>Rider</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((d) => <tr key={d.id}><td><b>{d.id}</b><small>{new Date(d.createdAt).toLocaleDateString()}</small></td><td>{d.customerName}</td><td>{d.address}</td><td>{d.rider?.name || <span className="muted">Unassigned</span>}</td><td><Status status={d.status} /></td><td><button className="inspect" onClick={() => setSelected(d)}>Inspect</button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No deliveries match your filters.</div>}</div></section></>}

        {screen === "dispatcher" && <><PageIntro title="Assignment desk" text="Match open deliveries with the right rider before the next handoff." /><div className="mini-stats"><Mini label="Unassigned" value={deliveries.filter(d => !d.rider).length} tone="warning" /><Mini label="Assigned" value={deliveries.filter(d => !!d.rider).length} tone="success" /><Mini label="Available riders" value={available} /><Mini label="On-time target" value="92%" /></div><section className="panel"><PanelHead eyebrow="DISPATCH QUEUE" title="Open assignments" note="Select a delivery and assign an available rider." /><div className="dispatch-list">{deliveries.map(d => <div className="dispatch-row" key={d.id} onClick={() => setSelected(d)}><span className="priority-dot">{d.status === "FAILED" ? "!" : "·"}</span><div><b>{d.id} · {d.customerName}</b><p>{d.address}</p></div><Status status={d.status} /></div>)}</div></section></>}

        {screen === "riders" && <><PageIntro title="Rider readiness" text="Review availability and current assignments across the live roster." /><div className="mini-stats"><Mini label="Total riders" value={riders.length} /><Mini label="Available" value={available} tone="success" /><Mini label="On assignment" value={riders.filter(r => r.status === "ASSIGNED").length} /><Mini label="Offline" value={riders.filter(r => r.status === "OFFLINE").length} tone="warning" /></div><section className="panel"><PanelHead eyebrow="RIDER OVERVIEW" title="Current fleet" note="Availability and assignment information from the operations API." /><div className="rider-list">{riders.map(r => <div className="rider-row" key={r.id}><span className="rider-avatar">{r.initials || r.name.split(" ").map(n => n[0]).join("").slice(0,2)}</span><div><b>{r.name}</b><small>{r.activeDeliveries || 0} active deliveries</small></div><span className="rider-zone"><Icon name="pin" size={13} />{r.area || "Network"}</span><strong>{r.activeDeliveries || 0}</strong><Status status={r.status === "AVAILABLE" ? "DELIVERED" : r.status === "ASSIGNED" ? "ASSIGNED" : "CANCELLED"} /></div>)}</div></section></>}
      </div>
    </main>

    {selected && <aside className="details"><button className="close" onClick={() => setSelected(null)}><Icon name="close" /></button><span className="eyebrow">DELIVERY DETAILS</span><h2>{selected.id}</h2><Status status={selected.status} /><div className="detail-block"><small>CUSTOMER</small><b>{selected.customerName}</b></div><div className="detail-block"><small>DESTINATION</small><b>{selected.address}</b></div><div className="detail-block"><small>ASSIGNED RIDER</small>{selected.rider ? <b>{selected.rider.name}</b> : <span className="unassigned">No rider assigned</span>}</div><div className="detail-block"><small>ITEMS</small>{selected.items.map(i => <span key={i.id}>{i.name} ×{i.quantity}</span>)}</div><div className="detail-actions"><select value="" onChange={(e) => { if (e.target.value) void updateStatus(selected.id, e.target.value as DeliveryStatus); }}><option value="">Update status…</option><option value="REQUESTED">Requested</option><option value="ASSIGNED">Assigned</option><option value="IN_TRANSIT">In transit</option><option value="DELIVERED">Delivered</option><option value="FAILED">Failed</option><option value="CANCELLED">Cancelled</option></select><select value="" onChange={(e) => { if (e.target.value) void assign(selected.id, e.target.value); }}><option value="">Assign rider…</option>{riders.filter(r => r.status === "AVAILABLE").map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div></aside>}
    {modal && <CreateModal onClose={() => setModal(false)} onSubmit={createDelivery} />}
  </div>;
}

function Metric({ label, value, detail, trend, icon, tone }: { label: string; value: string | number; detail: string; trend: string; icon: string; tone: string }) { return <article className={`metric metric-${tone}`}><div className="metric-top"><span><Icon name={icon} size={16} /></span><small>{trend}</small></div><label>{label}</label><strong>{value}</strong><em>{detail}</em></article>; }
function Mini({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) { return <div className={`mini ${tone}`}><span>{label}</span><b>{value}</b><small>Live records</small></div>; }
function PanelHead({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) { return <div className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3><p>{note}</p></div><i className="live-indicator"><span className="live-dot" />Live</i></div>; }
function PageIntro({ title, text, action }: { title: string; text: string; action?: () => void }) { return <section className="page-intro"><div><span className="eyebrow">REFLEX CONTROL ROOM</span><h2>{title}</h2><p>{text}</p></div>{action && <button className="primary" onClick={action}><Icon name="plus" size={15} />New delivery</button>}</section>; }
function CreateModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (a: string,b: string,c: string,d: number) => void }) { const [a,setA]=useState(""); const [b,setB]=useState(""); const [c,setC]=useState(""); const [d,setD]=useState(1); return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={(e) => { e.preventDefault(); onSubmit(a,b,c,d); }}><button type="button" className="close" onClick={onClose}><Icon name="close" /></button><span className="eyebrow">CREATE DELIVERY</span><h2>New delivery</h2><p>Add the customer, destination and item details.</p><label>Customer name<input required value={a} onChange={e=>setA(e.target.value)} placeholder="e.g. Amara Wanjiku" /></label><label>Delivery address<textarea required value={b} onChange={e=>setB(e.target.value)} placeholder="Enter the complete delivery address" /></label><div className="form-row"><label>Item<input required value={c} onChange={e=>setC(e.target.value)} placeholder="e.g. Clothing order" /></label><label>Quantity<input required min="1" type="number" value={d} onChange={e=>setD(Math.max(1,Number(e.target.value)||1))} /></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">Create delivery <Icon name="arrow" size={14} /></button></div></form></div>; }

export default App;
