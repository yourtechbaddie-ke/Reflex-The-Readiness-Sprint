const configuredApiUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const API_BASE_URL = configuredApiUrl.replace(/\/+$/, "").endsWith("/api/v1")
  ? configuredApiUrl.replace(/\/+$/, "")
  : `${configuredApiUrl.replace(/\/+$/, "")}/api/v1`;

export const RIDER_API_BASE_URL = API_BASE_URL;
export default API_BASE_URL;
