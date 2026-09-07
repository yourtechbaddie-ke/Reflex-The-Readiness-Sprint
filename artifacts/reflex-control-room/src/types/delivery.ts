export type DeliveryStatus =
  | "REQUESTED"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Rider {
  id: string;
  name: string;
  phone?: string;
  initials?: string;
  area?: string;
  activeDeliveries?: number;
  status?: "AVAILABLE" | "ASSIGNED" | "OFFLINE";
}

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone?: string;
  address: string;
  status: DeliveryStatus;
  riderId?: string | null;
  rider?: Rider | null;
  items: DeliveryItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDeliveryRequest {
  customerName: string;
  customerPhone?: string;
  address: string;
  items: DeliveryItem[];
}

export interface AssignRiderRequest {
  riderId: string;
}

export interface UpdateDeliveryStatusRequest {
  status: DeliveryStatus;
}
