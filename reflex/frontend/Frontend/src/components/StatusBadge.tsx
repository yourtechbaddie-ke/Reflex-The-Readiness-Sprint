import type { DeliveryStatus } from "../types/delivery";

interface StatusBadgeProps { status: DeliveryStatus; }

const statusLabels: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span className="status-dot" aria-hidden="true" /><span>{statusLabels[status]}</span></span>;
}

export default StatusBadge;
