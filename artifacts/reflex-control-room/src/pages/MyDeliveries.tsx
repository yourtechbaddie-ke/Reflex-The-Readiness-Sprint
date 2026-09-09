import { useCallback, useEffect, useState } from "react";
import { getControlRoomDeliveries, updateControlRoomDeliveryStatus } from "../api/controlRoomApi";
import type { Delivery } from "../types/delivery";

const CURRENT_USER_ID = "current-user";

export function MyDeliveries({ currentUserId = CURRENT_USER_ID }: { currentUserId?: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await getControlRoomDeliveries();
      setDeliveries(all.filter((delivery) => delivery.riderId === currentUserId || delivery.rider?.id === currentUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your deliveries.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { void load(); }, [load]);

  async function advance(delivery: Delivery) {
    const next = delivery.status === "ASSIGNED" ? "PICKED_UP" : delivery.status === "PICKED_UP" ? "DELIVERED" : null;
    if (!next) return;
    setAction(delivery.id);
    setError("");
    try {
      await updateControlRoomDeliveryStatus(delivery.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update delivery status.");
    } finally {
      setAction(null);
    }
  }

  const active = deliveries.filter((d) => d.status === "ASSIGNED" || d.status === "PICKED_UP").length;
  const completed = deliveries.filter((d) => d.status === "DELIVERED").length;

  return (
    <section className="panel">
      <div className="panel-header">
        <div><p className="eyebrow">Rider portal</p><h3>My Deliveries</h3><p className="panel-subtitle">Your assigned deliveries and their current status.</p></div>
        <button className="secondary-button compact-button" onClick={() => void load()}>Refresh</button>
      </div>
      <div className="mini-stats rider-stats"><div className="mini-stat"><span>Total</span><strong>{deliveries.length}</strong></div><div className="mini-stat"><span>Active</span><strong>{active}</strong></div><div className="mini-stat success"><span>Completed</span><strong>{completed}</strong></div></div>
      {error && <div className="error-state rider-error"><strong>Delivery update issue</strong><span>{error}</span></div>}
      {loading ? <div className="loading-state"><span className="loading-spinner" /> Loading your deliveries...</div> : deliveries.length === 0 ? <div className="empty-state rider-empty"><div className="empty-icon">✓</div><strong>You&apos;re all caught up</strong><p>There are no deliveries assigned to this rider.</p></div> : (
        <div className="rider-delivery-list">
          {deliveries.map((delivery) => (
            <article className="rider-delivery-card" key={delivery.id}>
              <div className="rider-delivery-main">
                <div className="rider-delivery-icon">{delivery.status === "DELIVERED" ? "✓" : "↗"}</div>
                <div className="rider-delivery-info">
                  <div className="rider-delivery-title"><strong>{delivery.itemDescription || "Delivery"}</strong><span className="delivery-id">{delivery.id}</span></div>
                  <div className="rider-delivery-meta"><span><b>Destination</b>{delivery.deliveryAddress || delivery.address || "—"}</span><span><b>Customer</b>{delivery.customerName}</span></div>
                </div>
                <span className={`status status-${delivery.status.toLowerCase()}`}><span />{delivery.status.replaceAll("_", " ")}</span>
              </div>
              {(delivery.status === "ASSIGNED" || delivery.status === "PICKED_UP") && <button className="primary-button" disabled={action === delivery.id} onClick={() => void advance(delivery)}>{action === delivery.id ? "Updating..." : delivery.status === "ASSIGNED" ? "Mark picked up" : "Mark delivered"}<span>→</span></button>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyDeliveries;
