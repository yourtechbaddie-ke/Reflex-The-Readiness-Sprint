import { useCallback, useEffect, useState } from "react";
import { assignRider, getDeliveries, getRiders } from "../api/deliveriesApi";
import type { Delivery, Rider } from "../types/delivery";

interface DashboardProps { onNavigate?: (screen: "deliveries") => void; }

function Dashboard({ onNavigate }: DashboardProps) {
  const [token] = useState(() => localStorage.getItem("reflexToken") || localStorage.getItem("token") || "");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState("");
  const [selectedRider, setSelectedRider] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setError("Sign in as a dispatcher to enable live assignment controls."); return; }
    setLoading(true); setError("");
    try { const [nextDeliveries, nextRiders] = await Promise.all([getDeliveries(token), getRiders(token)]); setDeliveries(nextDeliveries); setRiders(nextRiders); if (!selectedDelivery) setSelectedDelivery(nextDeliveries.find((d) => d.status === "PENDING")?.id || ""); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load live operations."); }
    finally { setLoading(false); }
  }, [token, selectedDelivery]);

  useEffect(() => { void load(); }, [load]);

  const pending = deliveries.filter((d) => d.status === "PENDING");
  const active = deliveries.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP");
  const delivered = deliveries.filter((d) => d.status === "DELIVERED");
  const availableRiders = riders.filter((r) => r.status === "AVAILABLE");

  const handleAssign = async () => {
    if (!token || !selectedDelivery || !selectedRider) return;
    setSaving(true); setError("");
    try { await assignRider(selectedDelivery, { riderId: selectedRider }, token); setSelectedRider(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to assign rider."); }
    finally { setSaving(false); }
  };

  return <div className="dashboard-page">
    <div className="page-intro"><div><p className="eyebrow">Operations overview</p><h2>Good afternoon, Control Room.</h2><p>Here&apos;s what&apos;s happening across your delivery network right now.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <section className="metrics-grid" aria-label="Delivery metrics"><article className="metric-card"><div className="metric-card-top"><span className="metric-label">Total deliveries</span></div><strong className="metric-value">{deliveries.length}</strong><span className="metric-detail">Live from the API</span></article><article className="metric-card"><div className="metric-card-top"><span className="metric-label">Pending</span></div><strong className="metric-value">{pending.length}</strong><span className="metric-detail">Waiting for assignment</span></article><article className="metric-card"><div className="metric-card-top"><span className="metric-label">Active</span></div><strong className="metric-value">{active.length}</strong><span className="metric-detail">Assigned or picked up</span></article><article className="metric-card"><div className="metric-card-top"><span className="metric-label">Delivered</span></div><strong className="metric-value">{delivered.length}</strong><span className="metric-detail">Completed deliveries</span></article></section>
    {!token && <div className="error-state"><strong>Dispatcher sign-in required</strong><span>Sign in once to unlock assignments, rider data and live delivery records.</span><button type="button" className="secondary-button" onClick={() => onNavigate?.("deliveries")}>Open dispatcher sign-in</button></div>}
    {token && error && <div className="error-state"><strong>Control Room notice</strong><span>{error}</span></div>}
    <section className="panel dispatch-action-panel"><div className="panel-header"><div><p className="eyebrow">Assignment action</p><h3>Assign a rider</h3><p className="panel-subtitle">Choose a pending delivery and an available rider.</p></div><span className="dispatch-action-icon">🚚</span></div><div className="dispatch-action-content"><div className="dispatch-detail-card"><div><span>Pending deliveries</span><strong>{pending.length}</strong></div><div><span>Available riders</span><strong>{availableRiders.length}</strong></div><div><span>Active deliveries</span><strong>{active.length}</strong></div></div><div className="form-grid"><label className="dispatch-select-field"><span>Delivery</span><select value={selectedDelivery} onChange={(e) => setSelectedDelivery(e.target.value)} disabled={!token}><option value="">Choose a pending delivery</option>{pending.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.id} · {delivery.deliveryAddress}</option>)}</select></label><label className="dispatch-select-field"><span>Available rider</span><select value={selectedRider} onChange={(e) => setSelectedRider(e.target.value)} disabled={!token}><option value="">Choose a rider</option>{availableRiders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name} · {rider.area || "Nairobi"}</option>)}</select></label></div><button className="primary-button dispatch-assign-button" type="button" disabled={!token || !selectedDelivery || !selectedRider || saving} onClick={() => void handleAssign()}>{saving ? "Assigning…" : "Assign rider"}<span>→</span></button></div></section>
    <section className="panel activity-panel"><div className="panel-header"><div><p className="eyebrow">Live activity</p><h3>Recent deliveries</h3><p className="panel-subtitle">The latest records returned by the API.</p></div><span className="live-indicator"><span className="status-dot" />Live</span></div><div className="activity-list">{deliveries.slice(0, 6).map((delivery) => <article className="activity-row" key={delivery.id}><div className="activity-marker"><span className={`activity-dot ${delivery.status.toLowerCase()}`} /></div><div className="activity-content"><div className="activity-heading"><strong>{delivery.itemDescription}</strong><span>{delivery.status.replace("_", " ")}</span></div><p>{delivery.customerName} · {delivery.deliveryAddress}</p></div><span className="activity-id">{delivery.id}</span></article>)}{deliveries.length === 0 && !loading && <div className="empty-state"><strong>No deliveries yet</strong><p>The API returned no deliveries for this account.</p></div>}</div></section>
  </div>;
}

export default Dashboard;
