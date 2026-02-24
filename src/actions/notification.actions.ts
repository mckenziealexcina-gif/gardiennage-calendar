"use server";

import { prisma } from "@/lib/prisma";
import { sendEmailReminder } from "@/lib/resend";
import {
  getWeekSaturday,
  resolveUserForWeekend,
  type RotationUser,
} from "@/lib/rotation";
import { startOfDay } from "date-fns";

// Form-compatible action for use as a <form action={...}> prop.
// Sends the email reminder for the current weekend.
export async function sendCurrentWeekendReminder(): Promise<void> {
  await sendWeekendReminder();
}

// Manual admin trigger to send (or resend) the weekend email reminder.
export async function sendWeekendReminder(weekStartIso?: string): Promise<{
  success: boolean;
  error?: string;
  to?: string;
}> {
  try {
    const targetDate = weekStartIso ? new Date(weekStartIso) : new Date();
    const saturday = startOfDay(getWeekSaturday(targetDate));

    // Override takes precedence over rotation
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

    return { success: result.success, to: user.name };
  } catch (err) {
    console.error("sendWeekendReminder error:", err);
    return { success: false, error: "Impossible d'envoyer l'email." };
  }
}
