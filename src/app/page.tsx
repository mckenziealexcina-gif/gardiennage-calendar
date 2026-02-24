export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  resolveUserForWeekend,
  getUpcomingWeekends,
  getWeekSaturday,
} from "@/lib/rotation";
import { HeroSection } from "@/components/HeroSection";
import { CalendarGrid } from "@/components/CalendarGrid";
import { startOfDay } from "date-fns";

// Pure Server Component — no client state, no useEffect
export default async function HomePage() {
  const [config, users, overrides] = await Promise.all([
    prisma.rotationConfig.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.user.findMany({ orderBy: { order: "asc" } }),
    prisma.override.findMany({
      include: { user: true },
      where: { weekStart: { gte: startOfDay(new Date()) } },
    }),
  ]);

  const today = new Date();
  const thisWeekSaturday = startOfDay(getWeekSaturday(today));

  // Override takes precedence over rotation for the hero section
  const currentOverride = overrides.find(
    (o) => o.weekStart.getTime() === thisWeekSaturday.getTime()
  );
  const currentUser =
    currentOverride?.user ??
    resolveUserForWeekend(
      today,
      config.seedDate,
      config.seedUserOrder,
      users
    );

  // Generate 13 weekends (~3 months), merging overrides
  const upcomingWeekends = getUpcomingWeekends(
    today,
    13,
    config.seedDate,
    config.seedUserOrder,
    users
  ).map((w) => {
    const override = overrides.find(
      (o) => o.weekStart.getTime() === w.weekStart.getTime()
    );
    return {
      weekStart: w.weekStart,
      user: override?.user ?? w.user,
      isOverride: !!override,
    };
  });

  return (
    <div className="min-h-screen">
      <HeroSection currentUser={currentUser} weekStart={thisWeekSaturday} />
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-semibold mb-6">
          Planning — 3 prochains mois
        </h2>
        <CalendarGrid weekends={upcomingWeekends} />
      </section>
    </div>
  );
}
