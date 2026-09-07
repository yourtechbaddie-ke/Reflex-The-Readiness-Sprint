import express from "express";
import cors from "cors";
import helmet from "helmet";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import riderRoutes from "./routes/rider.routes.js";

import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5177",
  "http://localhost:5173",
  "https://reflex-control-room01.onrender.com",
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((value) => value.trim()).filter(Boolean) : []),
]);

app.use(helmet());
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ success: true, service: "Reflex API", status: "ok" }));
app.use("/api/v1/deliveries", deliveryRoutes);
app.use("/api/v1/riders", riderRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
