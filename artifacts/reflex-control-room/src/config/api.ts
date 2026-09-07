const configuredApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "https://reflex-backend-ru4q.onrender.com/api/v1";

const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "").endsWith("/api/v1")
  ? configuredApiUrl.replace(/\/+$/, "")
  : `${configuredApiUrl.replace(/\/+$/, "")}/api/v1`;

export const RIDER_API_BASE_URL =
  import.meta.env.VITE_RIDER_API_URL || API_BASE_URL;

export default API_BASE_URL;
