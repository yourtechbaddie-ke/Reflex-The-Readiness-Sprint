import { useCallback, useEffect, useState } from "react";
import { getRiders } from "../api/deliveriesApi";
import { ApiError } from "../api/errors";
import type { Rider } from "../types/delivery";

function Riders() {
  const [token] = useState(() => localStorage.getItem("reflexToken") || localStorage.getItem("token") || "");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) { setLoading(false); setError("Sign in as a dispatcher to view riders."); return; }
    setLoading(true); setError("");
    try { setRiders(await getRiders(token)); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Unable to load riders."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const available = riders.filter((r) => r.status === "AVAILABLE").length;
  const assigned = riders.filter((r) => r.status === "ASSIGNED").length;

  return <div className="riders-page">
    <div className="page-intro"><div><p className="eyebrow">Fleet operations</p><h2>Riders</h2><p>Live rider availability and current assignments.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="mini-stats"><div className="mini-stat"><span>Total riders</span><strong>{riders.length}</strong></div><div className="mini-stat success"><span>Available</span><strong>{available}</strong></div><div className="mini-stat"><span>Assigned</span><strong>{assigned}</strong></div></div>
    {error && <div className="error-state"><strong>Unable to load riders</strong><span>{error}</span></div>}
    <section className="panel"><div className="panel-header"><div><p className="eyebrow">Rider overview</p><h3>Current fleet</h3><p className="panel-subtitle">Availability is calculated from active deliveries.</p></div><span className="panel-count">{riders.length} riders</span></div>
      {loading ? <div className="loading-state"><span className="loading-spinner" />Loading riders…</div> : <div className="rider-list">{riders.map((rider) => <article className="rider-row" key={rider.id}><div className="rider-avatar">{rider.initials || rider.name.slice(0, 2).toUpperCase()}</div><div className="rider-info"><strong>{rider.name}</strong><span>{rider.activeDeliveries ? `${rider.activeDeliveries} active delivery${rider.activeDeliveries === 1 ? "" : "ies"}` : "Ready for a new delivery"}</span></div><div className="rider-location"><span>Current area</span><strong>{rider.area || "Nairobi"}</strong></div><span className={`rider-status ${(rider.status || "OFFLINE").toLowerCase()}`}><span className="rider-status-dot" />{rider.status || "OFFLINE"}</span></article>)}</div>}
    </section>
  </div>;
}

export default Riders;
