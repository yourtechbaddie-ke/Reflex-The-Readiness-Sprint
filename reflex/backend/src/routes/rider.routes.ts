import { Router } from "express";
import { prisma } from "../config/database.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.get("/", authenticate, requireRole("DISPATCHER"), async (_req, res, next) => {
  try {
    const riders = await prisma.user.findMany({
      where: { role: "RIDER" },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
    });
    const active = await prisma.delivery.groupBy({
      by: ["riderId"],
      where: { riderId: { not: null }, status: { in: ["ASSIGNED", "PICKED_UP"] } },
      _count: { _all: true },
    });
    const activeMap = new Map(active.map((row) => [row.riderId!, row._count._all]));
    res.json({
      success: true,
      data: {
        riders: riders.map((rider) => ({
          ...rider,
          initials: rider.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
          area: "Nairobi",
          activeDeliveries: activeMap.get(rider.id) ?? 0,
          status: (activeMap.get(rider.id) ?? 0) > 0 ? "ASSIGNED" : "AVAILABLE",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
