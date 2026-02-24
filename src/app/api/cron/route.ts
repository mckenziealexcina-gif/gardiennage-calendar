import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailReminder } from "@/lib/resend";
import {
  getWeekSaturday,
  resolveUserForWeekend,
  type RotationUser,
} from "@/lib/rotation";
import { startOfDay } from "date-fns";

// Triggered by Vercel Cron: every Friday at 09:00 UTC (10:00 CET)
// Secured with CRON_SECRET set automatically by Vercel.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Friday → next day is Saturday
    const saturday = startOfDay(getWeekSaturday(new Date()));

    // Idempotency: skip if already sent for this weekend
    const alreadySent = await prisma.smsLog.findFirst({
      where: { weekStart: saturday, status: "sent" },
    });
    if (alreadySent) {
      return NextResponse.json({
        message: `Email already sent for ${saturday.toISOString()}`,
        skipped: true,
      });
    }

    // Override takes precedence
    const override = await prisma.override.findUnique({
      where: { weekStart: saturday },
      include: { user: true },
    });

    let user: RotationUser;

    if (override?.user) {
      const { id, name, phone, order } = override.user;
      user = { id, name, phone, order };
    } else {
      const [config, users] = await Promise.all([
        prisma.rotationConfig.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.user.findMany({ orderBy: { order: "asc" } }),
      ]);
      user = resolveUserForWeekend(
        saturday,
        config.seedDate,
        config.seedUserOrder,
        users
      );
    }

    const result = await sendEmailReminder(user, saturday);

    await prisma.smsLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        phone: user.phone,
        weekStart: saturday,
        status: result.success ? "sent" : "failed",
        messageId: result.id,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sentTo: user.name,
      weekend: saturday.toISOString(),
    });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
