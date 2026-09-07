import bcrypt from "bcryptjs";
import { prisma } from "./config/database.js";

export async function seedDemoData() {
  const dispatcherEmail = process.env.DEMO_DISPATCHER_EMAIL;
  const dispatcherPassword = process.env.DEMO_DISPATCHER_PASSWORD;
  const riderEmail = process.env.DEMO_RIDER_EMAIL;
  const riderPassword = process.env.DEMO_RIDER_PASSWORD;
  const retailerEmail = process.env.DEMO_RETAILER_EMAIL;
  const retailerPassword = process.env.DEMO_RETAILER_PASSWORD;

  if (!dispatcherEmail || !dispatcherPassword || !riderEmail || !riderPassword || !retailerEmail || !retailerPassword) {
    console.warn("Demo account seeding skipped: DEMO_* credentials are not configured.");
    return;
  }

  const definitions = [
    { name: "Reflex Dispatcher", email: dispatcherEmail, password: dispatcherPassword, role: "DISPATCHER" as const },
    { name: "Bob Rider", email: riderEmail, password: riderPassword, role: "RIDER" as const },
    { name: "Reflex Retailer", email: retailerEmail, password: retailerPassword, role: "RETAILER" as const },
  ];

  const users = new Map<string, { id: string }>();
  for (const demo of definitions) {
    const passwordHash = await bcrypt.hash(demo.password, 12);
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: { name: demo.name, role: demo.role, passwordHash },
      create: { name: demo.name, email: demo.email, role: demo.role, passwordHash },
      select: { id: true },
    });
    users.set(demo.email, user);
  }

  const retailer = users.get(retailerEmail)!;
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
      data: { deliveryId: delivery.id, status: "PENDING", changedById: retailer.id },
    });
  }
}
