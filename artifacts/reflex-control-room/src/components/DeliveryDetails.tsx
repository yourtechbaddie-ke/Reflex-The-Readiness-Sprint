import type { Delivery, DeliveryStatus } from "../types/delivery";

interface DeliveryDetailsProps {
  delivery: Delivery | null;
  onClose: () => void;
  onStatusChange?: (status: DeliveryStatus) => void;
}

export function DeliveryDetails({ delivery, onClose, onStatusChange }: DeliveryDetailsProps) {
  if (!delivery) return null;

  return (
    <div className="delivery-details-overlay" role="presentation" onClick={onClose}>
      <aside className="delivery-details" role="dialog" aria-modal="true" aria-label="Delivery details" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Delivery details</p>
            <h3>{delivery.id}</h3>
          </div>
          <button className="secondary-button compact-button" onClick={onClose} aria-label="Close delivery details">Close</button>
        </div>

        <div className="delivery-detail-grid">
          <div><span>Customer</span><strong>{delivery.customerName}</strong></div>
          <div><span>Status</span><strong>{delivery.status.replaceAll("_", " ")}</strong></div>
          <div><span>Destination</span><strong>{delivery.deliveryAddress || delivery.address || "—"}</strong></div>
          <div><span>Customer phone</span><strong>{delivery.customerPhone || "—"}</strong></div>
          <div><span>Retailer</span><strong>{delivery.retailer?.name || "—"}</strong></div>
          <div><span>Rider</span><strong>{delivery.rider?.name || "Unassigned"}</strong></div>
          <div className="delivery-detail-wide"><span>Items</span><strong>{delivery.itemDescription || "—"}</strong></div>
        </div>

        {onStatusChange && delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED" && (
          <div className="delivery-detail-actions">
            {delivery.status === "PENDING" && <button className="primary-button" onClick={() => onStatusChange("ASSIGNED")}>Mark assigned <span>→</span></button>}
            {delivery.status === "ASSIGNED" && <button className="primary-button" onClick={() => onStatusChange("PICKED_UP")}>Mark picked up <span>→</span></button>}
            {delivery.status === "PICKED_UP" && <button className="primary-button" onClick={() => onStatusChange("DELIVERED")}>Mark delivered <span>→</span></button>}
            <button className="secondary-button" onClick={() => onStatusChange("CANCELLED")}>Cancel delivery</button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default DeliveryDetails;
