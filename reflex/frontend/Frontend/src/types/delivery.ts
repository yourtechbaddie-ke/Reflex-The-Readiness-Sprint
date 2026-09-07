export type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

export interface Rider {
  id: string;
  name: string;
  phone?: string | null;
  email?: string;
  initials?: string;
  area?: string;
  activeDeliveries?: number;
  status?: "AVAILABLE" | "ASSIGNED" | "OFFLINE";
}

export interface DeliveryHistoryEntry {
  id?: string;
  status?: DeliveryStatus;
  changedAt?: string;
  createdAt?: string;
  changedBy?: { id?: string; name?: string };
}

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  deliveryAddress: string;
  itemDescription: string;
  status: DeliveryStatus;
  rider?: Rider | null;
  retailer?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
  history?: DeliveryHistoryEntry[];
}

export interface CreateDeliveryRequest {
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  itemDescription: string;
}

export interface AssignRiderRequest { riderId: string; }
export interface UpdateDeliveryStatusRequest { status: Extract<DeliveryStatus, "PICKED_UP" | "DELIVERED" | "CANCELLED">; }

export interface LoginRequest { email: string; password: string; }
export interface AuthUser { id: string; name: string; email: string; role: "RETAILER" | "DISPATCHER" | "RIDER"; }
export interface LoginResponse { user: AuthUser; token: string; }

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
}
