const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const BACKEND_API_URL = (process.env.BACKEND_API_URL || "https://reflex-backend-ru4q.onrender.com").replace(/\/+$/, "");
const frontendDist = path.join(__dirname, "artifacts", "reflex-control-room", "dist");

let dispatcherToken = process.env.CONTROL_ROOM_TOKEN || null;
let dispatcherLoginPromise = null;
let riderDirectoryCache = null;
let riderDirectoryPromise = null;

async function login(email, password) {
  const response = await fetch(`${BACKEND_API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !body.data?.token) {
    throw new Error(body?.error?.message || "Authentication failed");
  }
  return body.data;
}

async function getDispatcherToken() {
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

async function getLiveRiderDirectory() {
  if (riderDirectoryCache) return riderDirectoryCache;
  if (riderDirectoryPromise) return riderDirectoryPromise;

  const email = process.env.DEMO_RIDER_EMAIL;
  const password = process.env.DEMO_RIDER_PASSWORD;
  if (!email || !password) {
    throw new Error("Rider directory credentials are not configured");
  }

  riderDirectoryPromise = (async () => {
    const auth = await login(email, password);
    if (auth.user?.role !== "RIDER") throw new Error("Configured rider account is not a RIDER");

    const response = await fetch(`${BACKEND_API_URL}/api/v1/deliveries`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${auth.token}` },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !Array.isArray(body.data?.deliveries)) {
      throw new Error(body?.error?.message || "Could not load rider delivery data");
    }

    const deliveries = body.data.deliveries;
    const activeDeliveries = deliveries.filter((delivery) => ["ASSIGNED", "PICKED_UP"].includes(delivery.status)).length;
    const status = activeDeliveries > 0 ? "ASSIGNED" : "AVAILABLE";
    const user = auth.user;
    const rider = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status,
      activeDeliveries,
      initials: String(user.name || "R").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    };

    riderDirectoryCache = { riders: [rider] };
    return riderDirectoryCache;
  })().finally(() => { riderDirectoryPromise = null; });

  return riderDirectoryPromise;
}

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/v1", async (req, res) => {
  if (req.method === "GET" && req.path === "/riders") {
    try {
      const data = await getLiveRiderDirectory();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: {
          code: "RIDER_DIRECTORY_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Live rider data is unavailable.",
        },
      });
    }
  }

  const relativePath = req.originalUrl.slice("/api/v1".length);
  const targetUrl = `${BACKEND_API_URL}/api/v1${relativePath}`;
  const headers = { "Content-Type": "application/json" };

  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  } else if (!req.path.startsWith("/auth/")) {
    try {
      const token = await getDispatcherToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      return res.status(503).json({ success: false, error: { code: "DISPATCHER_AUTH_UNAVAILABLE", message: "Control Room authentication is unavailable." } });
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

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(body ?? {}),
    });
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    const text = await response.text();

    if (response.status === 401 && !req.headers.authorization) {
      dispatcherToken = null;
    }
    return res.status(response.status).send(text);
  } catch {
    return res.status(502).json({ success: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "The Reflex API is temporarily unavailable." } });
  }
});

app.use(express.static(frontendDist, { index: false }));
app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Reflex Control Room running on port ${PORT}`));
