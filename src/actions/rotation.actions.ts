"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { getWeekSaturday, resolveUserForWeekend } from "@/lib/rotation";

// ─── Swap two users' rotation positions ──────────────────────────────────────
// After swapping, the RotationConfig is reanchored to this Saturday so the
// currently-on-duty person remains on duty through the swap.
export async function swapUserOrder(
  userId1: string,
  userId2: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [user1, user2] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId1 } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId2 } }),
    ]);

    const config = await prisma.rotationConfig.findUniqueOrThrow({
      where: { id: 1 },
    });
    const allUsers = await prisma.user.findMany({ orderBy: { order: "asc" } });

    // Find which user is on duty this weekend BEFORE the swap
    const thisSaturday = startOfDay(getWeekSaturday(new Date()));
    const onDutyNow = resolveUserForWeekend(
      thisSaturday,
      config.seedDate,
      config.seedUserOrder,
      allUsers
    );

    // Perform swap using temp order value (99) to avoid unique constraint
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId1 }, data: { order: 99 } }),
      prisma.user.update({
        where: { id: userId2 },
        data: { order: user1.order },
      }),
      prisma.user.update({
        where: { id: userId1 },
        data: { order: user2.order },
      }),
    ]);

    // Read updated orders to find the on-duty user's new position
    const updatedOnDuty = await prisma.user.findUniqueOrThrow({
      where: { id: onDutyNow.id },
    });

    // Reanchor: seed = this Saturday, seedUserOrder = on-duty user's new order
    await prisma.rotationConfig.update({
      where: { id: 1 },
      data: {
        seedDate: thisSaturday,
        seedUserOrder: updatedOnDuty.order,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("swapUserOrder error:", err);
    return { success: false, error: "Impossible de permuter les utilisateurs." };
  }
}

// ─── Reorder the full rotation ────────────────────────────────────────────────
// `orderedUserIds` is an array of 4 user IDs in the desired new order (0→3).
// Reanchors seed to this Saturday with the new order=0 user on duty.
export async function reorderRotation(
  orderedUserIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (orderedUserIds.length !== 4) {
    return { success: false, error: "Exactement 4 utilisateurs requis." };
  }
  try {
    // Use temp values to avoid unique constraint during bulk update
    await prisma.$transaction([
      ...orderedUserIds.map((id, i) =>
        prisma.user.update({ where: { id }, data: { order: 100 + i } })
      ),
      ...orderedUserIds.map((id, i) =>
        prisma.user.update({ where: { id }, data: { order: i } })
      ),
    ]);

    const thisSaturday = startOfDay(getWeekSaturday(new Date()));
    await prisma.rotationConfig.update({
      where: { id: 1 },
      data: { seedDate: thisSaturday, seedUserOrder: 0 },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("reorderRotation error:", err);
    return {
      success: false,
      error: "Impossible de réorganiser la rotation.",
    };
  }
}

// ─── Set or update a weekend override ────────────────────────────────────────
export async function setWeekendOverride(
  weekStartIso: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const weekStart = startOfDay(new Date(weekStartIso));
    await prisma.override.upsert({
      where: { weekStart },
      update: { userId, reason },
      create: { weekStart, userId, reason },
    });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("setWeekendOverride error:", err);
    return {
      success: false,
      error: "Impossible de définir le remplacement.",
    };
  }
}

// ─── Remove a weekend override ────────────────────────────────────────────────
export async function removeWeekendOverride(
  weekStartIso: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const weekStart = startOfDay(new Date(weekStartIso));
    await prisma.override.delete({ where: { weekStart } });
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("removeWeekendOverride error:", err);
    return {
      success: false,
      error: "Impossible de supprimer le remplacement.",
    };
  }
}
