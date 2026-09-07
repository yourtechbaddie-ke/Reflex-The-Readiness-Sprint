import { useCallback, useEffect, useState } from "react";
import { getDeliveries, login, updateDeliveryStatus } from "../api/deliveriesApi";
import { ApiError } from "../api/errors";
import type { Delivery } from "../types/delivery";

function MyDeliveries() {
  const [token, setToken] = useState(() => localStorage.getItem("riderToken") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setDeliveries(await getDeliveries(token)); }
    catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { localStorage.removeItem("riderToken"); setToken(""); }
      setError(err instanceof Error ? err.message : "Unable to load deliveries.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetchDeliveries(); }, [fetchDeliveries]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginError("");
    try {
      const result = await login({ email: email.trim(), password });
      if (result.user.role !== "RIDER") { setLoginError("This account is not a rider account."); return; }
      localStorage.setItem("riderToken", result.token); setToken(result.token);
    } catch (err) { setLoginError(err instanceof Error ? err.message : "Login failed."); }
  };

  const advanceStatus = async (delivery: Delivery) => {
    if (!token) return;
    const nextStatus = delivery.status === "ASSIGNED" ? "PICKED_UP" : delivery.status === "PICKED_UP" ? "DELIVERED" : null;
    if (!nextStatus) return;
    setSavingId(delivery.id);
    try { await updateDeliveryStatus(delivery.id, { status: nextStatus }, token); await fetchDeliveries(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update delivery status."); }
    finally { setSavingId(null); }
  };

  if (!token) return <div className="rider-login-page"><div className="rider-login-card"><div className="rider-login-brand"><div className="brand-mark">R</div><div><strong>Reflex</strong><span>Control Room</span></div></div><div className="rider-login-heading"><p className="eyebrow">Rider portal</p><h2>Welcome back.</h2><p>Sign in to view and manage your assigned deliveries.</p></div><form className="rider-login-form" onSubmit={handleLogin}><label className="form-field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label className="form-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>{loginError && <div className="login-error"><span>!</span>{loginError}</div>}<button className="primary-button login-button" type="submit">Sign in <span>→</span></button></form></div></div>;

  const active = deliveries.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP").length;
  const completed = deliveries.filter((d) => d.status === "DELIVERED").length;

  return <div className="rider-page"><div className="page-intro"><div><p className="eyebrow">Rider portal</p><h2>My Deliveries</h2><p>Stay on top of the deliveries currently assigned to you.</p></div><button type="button" className="secondary-button" onClick={() => void fetchDeliveries()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="mini-stats rider-stats"><div className="mini-stat"><span>Total deliveries</span><strong>{deliveries.length}</strong></div><div className="mini-stat"><span>Active</span><strong>{active}</strong></div><div className="mini-stat success"><span>Completed</span><strong>{completed}</strong></div></div>
    {error && <div className="error-state rider-error"><strong>Unable to load deliveries</strong><span>{error}</span><button type="button" className="secondary-button" onClick={() => void fetchDeliveries()}>Try again</button></div>}
    {!error && !loading && <section className="panel"><div className="panel-header"><div><p className="eyebrow">Your queue</p><h3>Assigned deliveries</h3><p className="panel-subtitle">Update each delivery as you move through your route.</p></div><span className="panel-count">{deliveries.length} deliveries</span></div>
      {deliveries.length === 0 ? <div className="empty-state rider-empty"><div className="empty-icon">✓</div><strong>You&apos;re all caught up</strong><p>There are no deliveries assigned to you right now.</p></div> : <div className="rider-delivery-list">{deliveries.map((delivery) => <article className="rider-delivery-card" key={delivery.id}><div className="rider-delivery-main"><div className="rider-delivery-icon">{delivery.status === "DELIVERED" ? "✓" : "↗"}</div><div className="rider-delivery-info"><div className="rider-delivery-title"><strong>{delivery.itemDescription}</strong><span className="delivery-id">{delivery.id}</span></div><div className="rider-delivery-meta"><span><b>Destination</b>{delivery.deliveryAddress}</span><span><b>Customer</b>{delivery.customerName}</span></div></div></div><div className="rider-delivery-actions"><span className={`rider-status ${delivery.status.toLowerCase().replace("_", "-")}`}><span className="rider-status-dot" />{delivery.status.replace("_", " ")}</span>{(delivery.status === "ASSIGNED" || delivery.status === "PICKED_UP") && <button type="button" className="primary-button compact-button" disabled={savingId === delivery.id} onClick={() => void advanceStatus(delivery)}>{savingId === delivery.id ? "Saving…" : delivery.status === "ASSIGNED" ? "Mark picked up" : "Mark delivered"}<span>→</span></button>}</div></article>)}</div>}
    </section>}
  </div>;
}

export default MyDeliveries;
