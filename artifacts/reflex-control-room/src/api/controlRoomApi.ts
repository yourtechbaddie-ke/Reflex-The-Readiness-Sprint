import type { Delivery, DeliveryItem, Rider, DeliveryStatus } from "../types/delivery";
import API_BASE_URL from "../config/api";

interface ApiEnvelope<T> { success: boolean; data?: T; error?: { message?: string }; }

export interface DashboardActivity { id: string; title: string; description: string; time: string; status: string; }
export interface DashboardData {
  metrics: Array<{ label: string; value: number; detail: string; trend: string; tone: "plum" | "lavender" | "success" | "blush"; icon: "package" | "truck" | "check" | "warning"; }>;
  activity: DashboardActivity[];
  health: { score: number; deliverySuccess: number; riderAvailability: number; responseTime: string; };
}
export interface ControlRoomRider extends Rider { initials: string; area: string; activeDeliveries: number; }

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("dispatcherToken");
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  const result = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !result?.success || result.data === undefined) throw new Error(result?.error?.message || "The live operations data could not be loaded.");
  return result.data;
}

export async function getControlRoomDeliveries(): Promise<Delivery[]> {
  const result = await request<{ deliveries: Delivery[] }>("/deliveries");
  return result.deliveries || [];
}

export async function createControlRoomDelivery(data: { customerName: string; address: string; items: DeliveryItem[]; }): Promise<Delivery> {
  const itemDescription = data.items.map(item => `${item.name} (x${item.quantity || 1})`).join(", ");
  const result = await request<{ delivery: Delivery }>("/deliveries", { method: "POST", body: JSON.stringify({ customerName: data.customerName, deliveryAddress: data.address, customerPhone: "+254700000000", itemDescription }) });
  return result.delivery;
}

export async function getControlRoomRiders(): Promise<ControlRoomRider[]> {
  const result = await request<{ riders: ControlRoomRider[] }>("/riders");
  return result.riders || [];
}

export async function assignControlRoomRider(deliveryId: string, riderId: string): Promise<Delivery> {
  const result = await request<{ delivery: Delivery }>(`/deliveries/${deliveryId}/assign`, { method: "PATCH", body: JSON.stringify({ riderId }) });
  return result.delivery;
}

export async function updateControlRoomDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery> {
  const result = await request<{ delivery: Delivery }>(`/deliveries/${deliveryId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  return result.delivery;
}
