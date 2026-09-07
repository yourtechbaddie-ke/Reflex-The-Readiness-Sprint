export type DeliveryStatus = "PENDING" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";

export interface DeliveryItem {
  id?: string;
  name: string;
  quantity: number;
}

export interface Rider {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  initials?: string;
  area?: string;
  activeDeliveries?: number;
  status?: "AVAILABLE" | "ASSIGNED" | "OFFLINE";
}

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  address?: string;
  itemDescription?: string;
  status: DeliveryStatus;
  retailer?: { id: string; name: string };
  riderId?: string | null;
  rider?: Rider | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDeliveryRequest {
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  itemDescription: string;
}

export interface AssignRiderRequest { riderId: string; }
export interface UpdateDeliveryStatusRequest { status: DeliveryStatus; }
