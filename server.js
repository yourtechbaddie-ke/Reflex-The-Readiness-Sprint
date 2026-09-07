const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const BACKEND_API_URL = (process.env.BACKEND_API_URL || "https://reflex-backend-ru4q.onrender.com").replace(/\/+$/, "");
const frontendDist = path.join(__dirname, "artifacts", "reflex-control-room", "dist");

let dispatcherToken = process.env.CONTROL_ROOM_TOKEN || null;
let dispatcherLoginPromise = null;

async function login(email, password) {
  const response = await fetch(`${BACKEND_API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.data?.token) {
    throw new Error(body?.error?.message || `Authentication failed (${response.status})`);
  }
  return body.data;
}

async function getDispatcherToken(forceRefresh = false) {
  if (forceRefresh) dispatcherToken = null;
  if (dispatcherToken) return dispatcherToken;
  if (dispatcherLoginPromise) return dispatcherLoginPromise;
  const email = process.env.DEMO_DISPATCHER_EMAIL;
  const password = process.env.DEMO_DISPATCHER_PASSWORD;
  if (!email || !password) return null;
  dispatcherLoginPromise = login(email, password)
    .then((data) => {
      if (data.user?.role !== "DISPATCHER") throw new Error("Configured dispatcher account is not a DISPATCHER");
      dispatcherToken = data.token;
      return dispatcherToken;
    })
    .finally(() => { dispatcherLoginPromise = null; });
  return dispatcherLoginPromise;
}

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/v1", async (req, res) => {
  const relativePath = req.originalUrl.slice("/api/v1".length);
  const targetUrl = `${BACKEND_API_URL}/api/v1${relativePath}`;
  const browserAuthorization = req.headers.authorization || null;
  const headers = { "Content-Type": "application/json" };

  // Control Room overview reads are intentionally public. Dispatcher-only
  // operations still receive the server-side dispatcher token automatically.
  if (browserAuthorization) headers.Authorization = browserAuthorization;
  else if (!req.path.startsWith("/auth/") && !["GET", "HEAD"].includes(req.method)) {
    try {
      const token = await getDispatcherToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("[control-room] dispatcher authentication failed:", error);
      return res.status(503).json({
        success: false,
        error: {
          code: "DISPATCHER_AUTH_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Control Room authentication is unavailable.",
        },
      });
    }
  }

  let body = req.body;
  if (req.method === "POST" && req.path === "/deliveries" && body && body.address && Array.isArray(body.items)) {
    body = {
      customerName: body.customerName,
      customerPhone: body.customerPhone || "+254700000000",
      deliveryAddress: body.address,
      itemDescription: body.items.map((item) => `${item.name} (x${item.quantity || 1})`).join(", "),
    };
  }

  async function forward(requestHeaders) {
    return fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(body ?? {}),
    });
  }

  try {
    let response = await forward(headers);

    // A stale browser token must never block the public Control Room overview.
    // For dispatcher operations, retry once with the server-side dispatcher token.
    if (response.status === 401 && browserAuthorization && !req.path.startsWith("/auth/")) {
      try {
        const freshDispatcherToken = await getDispatcherToken(true);
        if (freshDispatcherToken) {
          response = await forward({ ...headers, Authorization: `Bearer ${freshDispatcherToken}` });
        }
      } catch (error) {
        console.error("[control-room] dispatcher retry failed:", error);
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    const text = await response.text();

    if (response.status >= 500) {
      console.error(`[control-room] upstream ${response.status} ${req.method} ${req.path}: ${text.slice(0, 500)}`);
    }
    if (response.status === 401 && !browserAuthorization) dispatcherToken = null;
    return res.status(response.status).send(text);
  } catch (error) {
    console.error("[control-room] upstream request failed:", error);
    return res.status(502).json({
      success: false,
      error: { code: "UPSTREAM_UNAVAILABLE", message: "The Reflex API is temporarily unavailable." },
    });
  }
});

app.use(express.static(frontendDist, { index: false }));
app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Reflex Control Room running on port ${PORT}`));
