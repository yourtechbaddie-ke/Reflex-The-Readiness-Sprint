import { useCallback, useEffect, useMemo, useState } from "react";
import DeliveryTable from "../components/DeliveryTable";
import DeliveryDetails from "../components/DeliveryDetails";
import { assignRider, getDeliveries, getRiders, login } from "../api/deliveriesApi";
import { ApiError } from "../api/errors";
import type { Delivery, Rider } from "../types/delivery";

function Deliveries() {
  const [token, setToken] = useState(() => localStorage.getItem("reflexToken") || localStorage.getItem("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const [nextDeliveries, nextRiders] = await Promise.all([getDeliveries(token), getRiders(token)]);
      setDeliveries(nextDeliveries); setRiders(nextRiders);
      setSelectedDelivery((current) => current ? nextDeliveries.find((d) => d.id === current.id) || null : null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem("reflexToken"); localStorage.removeItem("token"); setToken("");
        setError("Your session has expired. Please sign in again.");
      } else setError(err instanceof Error ? err.message : "Unable to load deliveries.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoginError("");
    try {
      const result = await login({ email: email.trim(), password });
      if (result.user.role !== "DISPATCHER") { setLoginError("This account is not a dispatcher account."); return; }
      localStorage.setItem("reflexToken", result.token); localStorage.setItem("token", result.token); setToken(result.token);
    } catch (err) { setLoginError(err instanceof Error ? err.message : "Login failed."); }
  };

  const handleAssign = async (deliveryId: string, riderId: string) => {
    if (!token) return;
    try { await assignRider(deliveryId, { riderId }, token); await load(); }
    catch (err) { throw err instanceof Error ? err : new Error("Assignment failed."); }
  };

  const filtered = useMemo(() => deliveries.filter((delivery) => {
    const query = search.toLowerCase().trim();
    const matchesSearch = !query || delivery.id.toLowerCase().includes(query) || delivery.customerName.toLowerCase().includes(query) || delivery.deliveryAddress.toLowerCase().includes(query);
    return matchesSearch && (statusFilter === "ALL" || delivery.status === statusFilter);
  }), [deliveries, search, statusFilter]);

  if (!token) {
    return <div className="rider-login-page"><div className="rider-login-card"><div className="rider-login-brand"><div className="brand-mark">R</div><div><strong>Reflex</strong><span>Control Room</span></div></div><div className="rider-login-heading"><p className="eyebrow">Dispatcher access</p><h2>Welcome back.</h2><p>Sign in to manage deliveries and assign riders.</p></div><form className="rider-login-form" onSubmit={handleLogin}><label className="form-field"><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label><label className="form-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>{loginError && <div className="login-error"><span>!</span>{loginError}</div>}<button className="primary-button login-button" type="submit">Sign in <span>→</span></button></form></div></div>;
  }

  const activeCount = deliveries.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP").length;
  const deliveredCount = deliveries.filter((d) => d.status === "DELIVERED").length;
  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;

  return <div className="deliveries-page">
    <div className="page-intro"><div><p className="eyebrow">Delivery management</p><h2>Deliveries</h2><p>Monitor, filter and assign current delivery activity.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="mini-stats"><div className="mini-stat"><span>Total</span><strong>{deliveries.length}</strong></div><div className="mini-stat warning"><span>Pending</span><strong>{pendingCount}</strong></div><div className="mini-stat"><span>Active</span><strong>{activeCount}</strong></div><div className="mini-stat success"><span>Delivered</span><strong>{deliveredCount}</strong></div></div>
    {error && <div className="error-state"><strong>Unable to load deliveries</strong><span>{error}</span><button type="button" className="secondary-button" onClick={() => void load()}>Try again</button></div>}
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Live register</p><h3>All deliveries</h3><p className="panel-subtitle">{filtered.length} deliveries matching your view.</p></div><span className="live-indicator"><span className="status-dot" />Monitoring</span></div>
      <div className="filters"><label className="search-field"><span className="sr-only">Search deliveries</span><span className="search-icon">⌕</span><input type="search" placeholder="Search delivery, customer or location..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="filter-control"><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="ASSIGNED">Assigned</option><option value="PICKED_UP">Picked up</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select></label></div>
      <DeliveryTable deliveries={filtered} riders={riders} onAssign={handleAssign} onView={setSelectedDelivery} />
    </section>
    {selectedDelivery && <DeliveryDetails delivery={selectedDelivery} onClose={() => setSelectedDelivery(null)} />}
  </div>;
}

export default Deliveries;
