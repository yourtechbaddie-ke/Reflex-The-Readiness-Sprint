import { useCallback, useEffect, useState } from "react";
import { getControlRoomDeliveries, updateControlRoomDeliveryStatus } from "../api/controlRoomApi";
import type { Delivery, DeliveryStatus } from "../types/delivery";
import { DeliveryDetails } from "../components/DeliveryDetails";

export function Deliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDeliveries(await getControlRoomDeliveries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deliveries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(status: DeliveryStatus) {
    if (!selected) return;
    try {
      const updated = await updateControlRoomDeliveryStatus(selected.id, status);
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update delivery status.");
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div><p className="eyebrow">Operations</p><h3>Deliveries</h3><p className="panel-subtitle">Live delivery records from the Reflex backend.</p></div>
        <button className="secondary-button compact-button" onClick={() => void load()}>Refresh</button>
      </div>
      {error && <div className="error-state"><strong>Delivery data issue</strong><span>{error}</span></div>}
      {loading ? <div className="loading-state"><span className="loading-spinner" /> Loading deliveries...</div> : deliveries.length === 0 ? <div className="empty-state"><strong>No deliveries found</strong><p>New delivery records will appear here when available.</p></div> : (
        <div className="rider-delivery-list">
          {deliveries.map((delivery) => (
            <button className="rider-delivery-card" key={delivery.id} onClick={() => setSelected(delivery)}>
              <div className="rider-delivery-main">
                <div className="rider-delivery-icon">{delivery.status === "DELIVERED" ? "✓" : "↗"}</div>
                <div className="rider-delivery-info">
                  <div className="rider-delivery-title"><strong>{delivery.itemDescription || "Delivery"}</strong><span className="delivery-id">{delivery.id}</span></div>
                  <div className="rider-delivery-meta"><span><b>Customer</b>{delivery.customerName}</span><span><b>Destination</b>{delivery.deliveryAddress || delivery.address || "—"}</span><span><b>Rider</b>{delivery.rider?.name || "Unassigned"}</span></div>
                </div>
                <span className={`status status-${delivery.status.toLowerCase()}`}><span />{delivery.status.replaceAll("_", " ")}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <DeliveryDetails delivery={selected} onClose={() => setSelected(null)} onStatusChange={(status) => void updateStatus(status)} />
    </section>
  );
}

export default Deliveries;
