import { Router } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const riders = await prisma.user.findMany({
      where: { role: "RIDER" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        availability: true,
        serviceArea: true,
      },
      orderBy: { name: "asc" },
    });

    const active = await prisma.delivery.groupBy({
      by: ["riderId"],
      where: {
        riderId: { not: null },
        status: { in: ["ASSIGNED", "PICKED_UP"] },
      },
      _count: { _all: true },
    });

    const activeMap = new Map(active.map((row) => [row.riderId!, row._count._all]));
    const authenticatedDispatcher = req.user?.role === "DISPATCHER";

    res.json({
      success: true,
      data: {
        riders: riders.map((rider) => {
          const activeDeliveries = activeMap.get(rider.id) ?? 0;
          const status = rider.availability === "UNAVAILABLE"
            ? "UNAVAILABLE"
            : activeDeliveries > 0 || rider.availability === "ASSIGNED"
              ? "ASSIGNED"
              : "AVAILABLE";

          return {
            id: rider.id,
            name: rider.name,
            ...(authenticatedDispatcher ? { phone: rider.phone, email: rider.email } : {}),
            initials: rider.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
            area: rider.serviceArea || "Nairobi",
            activeDeliveries,
            status,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
