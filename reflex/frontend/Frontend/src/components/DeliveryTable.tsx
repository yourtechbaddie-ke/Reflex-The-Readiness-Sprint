import { useState } from "react";
import StatusBadge from "./StatusBadge";
import type { Delivery, Rider } from "../types/delivery";

interface DeliveryTableProps {
  deliveries: Delivery[];
  riders?: Rider[];
  onAssign?: (deliveryId: string, riderId: string) => Promise<void>;
  onView?: (delivery: Delivery) => void;
}

function getInitials(name?: string): string {
  if (!name) return "—";
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function DeliveryTable({ deliveries, riders = [], onAssign, onView }: DeliveryTableProps) {
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (deliveries.length === 0) {
    return <div className="empty-state delivery-empty-state"><div className="empty-icon" aria-hidden="true">⌕</div><strong>No deliveries found</strong><p>Try adjusting your search or status filter.</p></div>;
  }

  const handleAssign = async (deliveryId: string) => {
    const riderId = selectedRider[deliveryId];
    if (!riderId || !onAssign) return;
    setSavingId(deliveryId);
    try { await onAssign(deliveryId, riderId); setSelectedRider((current) => ({ ...current, [deliveryId]: "" })); }
    finally { setSavingId(null); }
  };

  return (
    <div className="table-wrapper">
      <table className="delivery-table">
        <thead><tr><th>Delivery</th><th>Customer</th><th>Destination</th><th>Rider</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {deliveries.map((delivery) => {
            const pending = delivery.status === "PENDING";
            const assigned = delivery.rider?.name || "Unassigned";
            return (
              <tr key={delivery.id}>
                <td><div className="delivery-reference"><span className="delivery-reference-mark">R</span><span className="delivery-id">{delivery.id}</span></div></td>
                <td><div className="customer-cell"><strong>{delivery.customerName}</strong><span>{delivery.customerPhone || "Customer"}</span></div></td>
                <td><div className="destination-cell"><span className="destination-pin">⌖</span><span>{delivery.deliveryAddress}</span></div></td>
                <td>
                  {pending && onAssign ? (
                    <div className="table-rider" style={{ gap: 8 }}>
                      <span className="table-rider-avatar">{getInitials(selectedRider[delivery.id] ? riders.find((r) => r.id === selectedRider[delivery.id])?.name : undefined)}</span>
                      <select aria-label={`Select rider for ${delivery.id}`} value={selectedRider[delivery.id] || ""} onChange={(e) => setSelectedRider((current) => ({ ...current, [delivery.id]: e.target.value }))}>
                        <option value="">Select rider</option>
                        {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="table-rider"><span className="table-rider-avatar">{getInitials(assigned)}</span><span className="rider-name">{assigned}</span></div>
                  )}
                </td>
                <td><StatusBadge status={delivery.status} /></td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {pending && onAssign && <button type="button" className="table-action" disabled={!selectedRider[delivery.id] || savingId === delivery.id} onClick={() => void handleAssign(delivery.id)}>{savingId === delivery.id ? "Assigning…" : "Assign"}</button>}
                    <button type="button" className="table-action" onClick={() => onView?.(delivery)} aria-label={`View ${delivery.id}`}>View →</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DeliveryTable;
