// Production API traffic intentionally goes through the same-origin Render proxy.
// The proxy forwards /api/v1 to the live Reflex backend and keeps dispatcher
// credentials server-side. Do not point the browser directly at the backend.
const API_BASE_URL = "/api/v1";

export const RIDER_API_BASE_URL = API_BASE_URL;
export default API_BASE_URL;
