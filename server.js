const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const BACKEND_API_URL = (process.env.BACKEND_API_URL || "https://reflex-backend-ru4q.onrender.com").replace(/\/+$/, "");
const frontendDist = path.join(__dirname, "artifacts", "reflex-control-room", "dist");

let dispatcherToken = process.env.CONTROL_ROOM_TOKEN || null;
let dispatcherLoginPromise = null;

async function getDispatcherToken() {
  if (dispatcherToken) return dispatcherToken;
  if (dispatcherLoginPromise) return dispatcherLoginPromise;
  const email = process.env.DEMO_DISPATCHER_EMAIL;
  const password = process.env.DEMO_DISPATCHER_PASSWORD;
  if (!email || !password) return null;
  dispatcherLoginPromise = fetch(`${BACKEND_API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(async (response) => {
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !body.data?.token) throw new Error("Dispatcher authentication failed");
    dispatcherToken = body.data.token;
    return dispatcherToken;
  }).finally(() => { dispatcherLoginPromise = null; });
  return dispatcherLoginPromise;
}

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/v1", async (req, res) => {
  const targetUrl = `${BACKEND_API_URL}/api/v1${req.originalUrl.slice("/api/v1".length)}`;
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

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    });
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);
    return res.status(response.status).send(await response.text());
  } catch {
    return res.status(502).json({ success: false, error: { code: "UPSTREAM_UNAVAILABLE", message: "The Reflex API is temporarily unavailable." } });
  }
});

app.use(express.static(frontendDist, { index: false }));
app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Reflex Control Room running on port ${PORT}`));
