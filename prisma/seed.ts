import { PrismaClient } from "@prisma/client";
import { startOfDay, isSaturday, nextSaturday } from "date-fns";

const prisma = new PrismaClient();

function getWeekSaturday(date: Date): Date {
  const d = startOfDay(date);
  return isSaturday(d) ? d : nextSaturday(d);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Create the 4 users in rotation order.
  // The `phone` field stores the email address (used by Resend).
  const usersData = [
    { name: "Alex", phone: "alex@exemple.com", order: 0 },
    { name: "Joey", phone: "joey@exemple.com", order: 1 },
    { name: "Elo", phone: "elo@exemple.com", order: 2 },
    { name: "Nathan", phone: "nathan@exemple.com", order: 3 },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { order: u.order },
      update: { name: u.name, phone: u.phone },
      create: u,
    });
    console.log(`  ✓ User: ${u.name} (position ${u.order})`);
  }

  // Set the rotation anchor: current weekend's Saturday, Alex (order=0) is on duty
  const seedSaturday = startOfDay(getWeekSaturday(new Date()));

  await prisma.rotationConfig.upsert({
    where: { id: 1 },
    update: { seedDate: seedSaturday, seedUserOrder: 0 },
    create: { id: 1, seedDate: seedSaturday, seedUserOrder: 0 },
  });

  console.log(
    `  ✓ RotationConfig: seed = ${seedSaturday.toDateString()}, Alex (order=0) on duty`
  );
  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
