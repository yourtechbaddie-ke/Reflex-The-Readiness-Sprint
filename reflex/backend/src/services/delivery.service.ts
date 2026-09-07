import { io } from "../server.js";
import { prisma } from "../config/database.js";

interface CreateDeliveryInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  itemDescription: string;
}

function publicDelivery(delivery: any) {
  return {
    ...delivery,
    id: delivery.referenceCode,
    databaseId: delivery.id,
  };
}

async function findDelivery(identifier: string) {
  return prisma.delivery.findFirst({
    where: {
      OR: [
        { id: identifier },
        { referenceCode: identifier },
      ],
    },
  });
}

export async function createDelivery(input: CreateDeliveryInput, retailerId: string) {
  const delivery = await prisma.delivery.create({
    data: {
      referenceCode: `RX-${Date.now().toString().slice(-4)}`,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      itemDescription: input.itemDescription,
      retailerId,
    },
  });

  await prisma.deliveryStatusHistory.create({
    data: {
      deliveryId: delivery.id,
      status: "PENDING",
      changedById: retailerId,
    },
  });

  return publicDelivery(delivery);
}

export async function getDeliveries(
  userId?: string,
  role?: "RETAILER" | "DISPATCHER" | "RIDER"
) {
  const include = {
    retailer: { select: { id: true, name: true } },
    rider: {
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        availability: true,
        serviceArea: true,
      },
    },
  };

  if (role === "RETAILER") {
    const deliveries = await prisma.delivery.findMany({
      where: { retailerId: userId },
      include,
      orderBy: { createdAt: "desc" },
    });
    return deliveries.map(publicDelivery);
  }

  if (role === "RIDER") {
    const deliveries = await prisma.delivery.findMany({
      where: { riderId: userId },
      include,
      orderBy: { createdAt: "desc" },
    });
    return deliveries.map(publicDelivery);
  }

  const deliveries = await prisma.delivery.findMany({
    include,
    orderBy: { createdAt: "desc" },
  });
  return deliveries.map(publicDelivery);
}

export async function getDeliveryById(
  identifier: string,
  userId?: string,
  role?: "RETAILER" | "DISPATCHER" | "RIDER"
) {
  const delivery = await prisma.delivery.findFirst({
    where: {
      OR: [
        { id: identifier },
        { referenceCode: identifier },
      ],
    },
    include: {
      retailer: { select: { id: true, name: true, phone: true } },
      rider: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          availability: true,
          serviceArea: true,
        },
      },
      history: {
        include: {
          changedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!delivery) return null;

  if (role === "RETAILER" && delivery.retailerId !== userId) throw new Error("FORBIDDEN");
  if (role === "RIDER" && delivery.riderId !== userId) throw new Error("FORBIDDEN");

  return publicDelivery(delivery);
}

export async function assignDelivery(identifier: string, riderId: string, dispatcherId: string) {
  const rider = await prisma.user.findUnique({ where: { id: riderId } });
  if (!rider || rider.role !== "RIDER") throw new Error("INVALID_RIDER");
  if (rider.availability === "UNAVAILABLE") throw new Error("RIDER_UNAVAILABLE");

  const delivery = await findDelivery(identifier);
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");
  if (delivery.status !== "PENDING") throw new Error("DELIVERY_NOT_ASSIGNABLE");

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        riderId,
        status: "ASSIGNED",
        assignedAt: new Date(),
      },
      include: {
        rider: { select: { id: true, name: true, phone: true, email: true, availability: true, serviceArea: true } },
        retailer: { select: { id: true, name: true } },
      },
    });

    await tx.user.update({ where: { id: riderId }, data: { availability: "ASSIGNED" } });
    await tx.deliveryStatusHistory.create({
      data: { deliveryId: delivery.id, status: "ASSIGNED", changedById: dispatcherId },
    });

    return result;
  });

  io.to(riderId).emit("delivery:updated", publicDelivery(updatedDelivery));
  io.to(updatedDelivery.retailerId).emit("delivery:updated", publicDelivery(updatedDelivery));
  io.emit("delivery:updated", publicDelivery(updatedDelivery));

  return publicDelivery(updatedDelivery);
}

export async function updateDeliveryStatus(
  identifier: string,
  riderId: string,
  newStatus: "PICKED_UP" | "DELIVERED" | "CANCELLED"
) {
  const delivery = await findDelivery(identifier);
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");
  if (delivery.riderId !== riderId) throw new Error("UNAUTHORIZED_RIDER");

  const validTransitions: Record<string, string[]> = {
    ASSIGNED: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
    PENDING: [],
  };

  if (!validTransitions[delivery.status]?.includes(newStatus)) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  const timestamp = new Date();
  const data: {
    status: "PICKED_UP" | "DELIVERED" | "CANCELLED";
    pickedUpAt?: Date;
    deliveredAt?: Date;
    riderId?: string | null;
  } = { status: newStatus };

  if (newStatus === "PICKED_UP") data.pickedUpAt = timestamp;
  if (newStatus === "DELIVERED") {
    data.deliveredAt = timestamp;
    data.riderId = delivery.riderId;
  }

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const result = await tx.delivery.update({
      where: { id: delivery.id },
      data,
      include: {
        rider: { select: { id: true, name: true, phone: true, email: true, availability: true, serviceArea: true } },
        retailer: { select: { id: true, name: true } },
      },
    });

    await tx.deliveryStatusHistory.create({
      data: { deliveryId: delivery.id, status: newStatus, changedById: riderId },
    });

    if (newStatus === "DELIVERED" || newStatus === "CANCELLED") {
      await tx.user.update({ where: { id: riderId }, data: { availability: "AVAILABLE" } });
    }

    return result;
  });

  io.to(riderId).emit("delivery:updated", publicDelivery(updatedDelivery));
  io.to(updatedDelivery.retailerId).emit("delivery:updated", publicDelivery(updatedDelivery));
  io.emit("delivery:updated", publicDelivery(updatedDelivery));

  return publicDelivery(updatedDelivery);
}
