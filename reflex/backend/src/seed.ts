import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./config/database.js";

export async function seedDemoData() {
  const dispatcherEmail = process.env.DEMO_DISPATCHER_EMAIL;
  const dispatcherPassword = process.env.DEMO_DISPATCHER_PASSWORD;
  const riderEmail = process.env.DEMO_RIDER_EMAIL;
  const riderPassword = process.env.DEMO_RIDER_PASSWORD;

  if (!dispatcherEmail || !dispatcherPassword || !riderEmail || !riderPassword) {
    console.warn("Demo account seeding skipped: DEMO_DISPATCHER_* and DEMO_RIDER_* are required.");
    return;
  }

  const dispatcher = await prisma.user.upsert({
    where: { email: dispatcherEmail },
    update: { name: "Reflex Dispatcher", role: "DISPATCHER", passwordHash: await bcrypt.hash(dispatcherPassword, 12) },
    create: { name: "Reflex Dispatcher", email: dispatcherEmail, role: "DISPATCHER", passwordHash: await bcrypt.hash(dispatcherPassword, 12) },
    select: { id: true },
  });

  await prisma.user.upsert({
    where: { email: riderEmail },
    update: { name: "Bob Rider", role: "RIDER", passwordHash: await bcrypt.hash(riderPassword, 12) },
    create: { name: "Bob Rider", email: riderEmail, role: "RIDER", passwordHash: await bcrypt.hash(riderPassword, 12) },
    select: { id: true },
  });

  let retailer = await prisma.user.findUnique({ where: { email: "retailer@reflex.test" }, select: { id: true } });
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

  const existingPending = await prisma.delivery.findFirst({
    where: { itemDescription: "Demo delivery for Bob Rider", status: "PENDING" },
  });

  if (!existingPending) {
    const delivery = await prisma.delivery.create({
      data: {
        customerName: "Amara Wanjiku",
        customerPhone: "+254700000000",
        deliveryAddress: "Westlands, Nairobi",
        itemDescription: "Demo delivery for Bob Rider",
        status: "PENDING",
        retailerId: retailer.id,
      },
    });
    await prisma.deliveryStatusHistory.create({
      data: { deliveryId: delivery.id, status: "PENDING", changedById: dispatcher.id },
    });
  }
}
