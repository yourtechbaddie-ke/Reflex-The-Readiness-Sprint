import API_BASE_URL from "../config/api";
import { ApiError } from "./errors";

interface RequestOptions extends RequestInit {
  token?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string };
}

async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...fetchOptions } = options;
  const requestHeaders = new Headers(headers);

  if (!(fetchOptions.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  requestHeaders.set("Accept", "application/json");

  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers: requestHeaders,
    });
  } catch {
    throw new ApiError("Unable to reach the Reflex API. Please check the connection and try again.", 0, "NETWORK_ERROR");
  }

  const contentType = response.headers.get("content-type") || "";
  const responseData: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const envelope = responseData as ApiEnvelope<unknown> | null;
    const error = envelope?.error;
    throw new ApiError(
      error?.message || (typeof responseData === "string" ? responseData : "The request could not be completed."),
      response.status,
      error?.code,
    );
  }

  const envelope = responseData as ApiEnvelope<T> | null;
  if (envelope && typeof envelope === "object" && "success" in envelope) {
    if (!envelope.success) {
      throw new ApiError(envelope.error?.message || "The request could not be completed.", response.status, envelope.error?.code);
    }
    return envelope.data as T;
  }

  return responseData as T;
}

export default apiClient;
