import apiClient from "./apiClient";
import type { AssignRiderRequest, CreateDeliveryRequest, Delivery, LoginRequest, LoginResponse, Rider, UpdateDeliveryStatusRequest } from "../types/delivery";

export const getDeliveries = (token: string) =>
  apiClient<{ deliveries: Delivery[] }>("/deliveries", { method: "GET", token }).then((data) => data.deliveries ?? []);

export const getDelivery = (deliveryId: string, token: string) =>
  apiClient<{ delivery: Delivery }>(`/deliveries/${deliveryId}`, { method: "GET", token }).then((data) => data.delivery);

export const createDelivery = (data: CreateDeliveryRequest, token: string) =>
  apiClient<{ delivery: Delivery }>("/deliveries", { method: "POST", body: JSON.stringify(data), token }).then((result) => result.delivery);

export const assignRider = (deliveryId: string, data: AssignRiderRequest, token: string) =>
  apiClient<{ delivery: Delivery }>(`/deliveries/${deliveryId}/assign`, { method: "PATCH", body: JSON.stringify(data), token }).then((result) => result.delivery);

export const updateDeliveryStatus = (deliveryId: string, data: UpdateDeliveryStatusRequest, token: string) =>
  apiClient<{ delivery: Delivery }>(`/deliveries/${deliveryId}/status`, { method: "PATCH", body: JSON.stringify(data), token }).then((result) => result.delivery);

export const getRiders = (token: string) =>
  apiClient<{ riders: Rider[] }>("/riders", { method: "GET", token }).then((data) => data.riders ?? []);

export const login = (data: LoginRequest) =>
  apiClient<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) });
