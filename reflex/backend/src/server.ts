import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { seedDemoData } from "./seed.js";

const PORT = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_URL || "https://reflex-control-room01.onrender.com";

const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: frontendOrigin.split(",").map((value) => value.trim()) },
});

io.on("connection", (socket) => {
  socket.on("join", (userId: string) => socket.join(userId));
});

async function start() {
  try {
    await seedDemoData();
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Reflex API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Reflex API failed to start:", error);
    process.exit(1);
  }
}

void start();
