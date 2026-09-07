import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./config/database.js";

export async function seedDemoData() {
  const dispatcherEmail = process.env.DEMO_DISPATCHER_EMAIL;
  const dispatcherPassword = process.env.DEMO_DISPATCHER_PASSWORD;
  const configuredRiderEmail = process.env.DEMO_RIDER_EMAIL;
  const riderPassword = process.env.DEMO_RIDER_PASSWORD;

  if (!dispatcherEmail || !dispatcherPassword || !configuredRiderEmail || !riderPassword) {
    console.warn("Demo account seeding skipped: DEMO_DISPATCHER_* and DEMO_RIDER_* are required.");
    return;
  }

  const dispatcher = await prisma.user.upsert({
    where: { email: dispatcherEmail },
    update: {
      name: "Reflex Dispatcher",
      role: "DISPATCHER",
      passwordHash: await bcrypt.hash(dispatcherPassword, 12),
    },
    create: {
      name: "Reflex Dispatcher",
      email: dispatcherEmail,
      role: "DISPATCHER",
      passwordHash: await bcrypt.hash(dispatcherPassword, 12),
    },
    select: { id: true },
  });

  const riderPasswordHash = await bcrypt.hash(riderPassword, 12);
  const riderDefinitions = [
    { name: "Kevin Mwangi", email: configuredRiderEmail, area: "Westlands", availability: "ASSIGNED" as const },
    { name: "Brian Kamau", email: "brian.kamau@reflex.test", area: "Kilimani", availability: "AVAILABLE" as const },
    { name: "Faith Njeri", email: "faith.njeri@reflex.test", area: "Lavington", availability: "ASSIGNED" as const },
    { name: "Samuel Kiptoo", email: "samuel.kiptoo@reflex.test", area: "Parklands", availability: "UNAVAILABLE" as const },
  ];

  const riders = new Map<string, { id: string }>();
  for (const definition of riderDefinitions) {
    const rider = await prisma.user.upsert({
      where: { email: definition.email },
      update: {
        name: definition.name,
        role: "RIDER",
        passwordHash: riderPasswordHash,
        availability: definition.availability,
        serviceArea: definition.area,
      },
      create: {
        name: definition.name,
        email: definition.email,
        role: "RIDER",
        passwordHash: riderPasswordHash,
        availability: definition.availability,
        serviceArea: definition.area,
      },
      select: { id: true },
    });
    riders.set(definition.name, rider);
  }

  let retailer = await prisma.user.findUnique({
    where: { email: "retailer@reflex.test" },
    select: { id: true },
  });

  if (!retailer) {
    retailer = await prisma.user.create({
      data: {
        name: "Reflex Retailer",
        email: "retailer@reflex.test",
        role: "RETAILER",
        passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 12),
      },
      select: { id: true },
    });
  }

  const deliveryDefinitions = [
    {
      referenceCode: "RX-1048",
      customerName: "Amara Wanjiku",
      customerPhone: "+254700000001",
      deliveryAddress: "Westlands, Nairobi",
      itemDescription: "Retail order",
      status: "ASSIGNED" as const,
      riderId: riders.get("Kevin Mwangi")!.id,
    },
    {
      referenceCode: "RX-1047",
      customerName: "Daniel Otieno",
      customerPhone: "+254700000002",
      deliveryAddress: "Kilimani, Nairobi",
      itemDescription: "Retail order",
      status: "PENDING" as const,
      riderId: null,
    },
    {
      referenceCode: "RX-1046",
      customerName: "Maya Shah",
      customerPhone: "+254700000003",
      deliveryAddress: "Lavington, Nairobi",
      itemDescription: "Retail order",
      status: "ASSIGNED" as const,
      riderId: riders.get("Faith Njeri")!.id,
    },
    {
      referenceCode: "RX-1044",
      customerName: "Customer RX-1044",
      customerPhone: "+254700000004",
      deliveryAddress: "Parklands, Nairobi",
      itemDescription: "Failed delivery",
      status: "CANCELLED" as const,
      riderId: null,
    },
  ];

  for (const definition of deliveryDefinitions) {
    const delivery = await prisma.delivery.upsert({
      where: { referenceCode: definition.referenceCode },
      update: {
        customerName: definition.customerName,
        customerPhone: definition.customerPhone,
        deliveryAddress: definition.deliveryAddress,
        itemDescription: definition.itemDescription,
        status: definition.status,
        retailerId: retailer.id,
        riderId: definition.riderId,
        assignedAt: definition.status === "ASSIGNED" ? new Date() : null,
      },
      create: {
        referenceCode: definition.referenceCode,
        customerName: definition.customerName,
        customerPhone: definition.customerPhone,
        deliveryAddress: definition.deliveryAddress,
        itemDescription: definition.itemDescription,
        status: definition.status,
        retailerId: retailer.id,
        riderId: definition.riderId,
        assignedAt: definition.status === "ASSIGNED" ? new Date() : null,
      },
    });

    const historyExists = await prisma.deliveryStatusHistory.findFirst({
      where: { deliveryId: delivery.id, status: definition.status },
      select: { id: true },
    });

    if (!historyExists) {
      await prisma.deliveryStatusHistory.create({
        data: {
          deliveryId: delivery.id,
          status: definition.status,
          changedById: definition.riderId ?? dispatcher.id,
        },
      });
    }
  }
}
