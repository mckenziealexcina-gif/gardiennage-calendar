export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { AdminSwapForm } from "@/components/AdminSwapForm";
import { AdminOverrideForm } from "@/components/AdminOverrideForm";
import { SmsLogTable } from "@/components/SmsLogTable";
import { sendCurrentWeekendReminder } from "@/actions/notification.actions";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

export default async function AdminPage() {
  const [users, overrides, smsLogs] = await Promise.all([
    prisma.user.findMany({ orderBy: { order: "asc" } }),
    prisma.override.findMany({
      include: { user: true },
      orderBy: { weekStart: "asc" },
      where: { weekStart: { gte: new Date() } },
    }),
    prisma.smsLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gérez la rotation et les remplacements
        </p>
      </div>

      {/* Rotation order management */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Ordre de rotation</h2>
        <AdminSwapForm users={users} />
      </section>

      {/* Weekend overrides */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Remplacements ponctuels</h2>
        <AdminOverrideForm users={users} existingOverrides={overrides} />
      </section>

      {/* Manual email trigger */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Rappel email manuel</h2>
        <p className="text-sm text-muted-foreground">
          Envoie le rappel email pour le weekend en cours à la personne de garde.
        </p>
        <form action={sendCurrentWeekendReminder}>
          <Button type="submit" variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            Envoyer le rappel maintenant
          </Button>
        </form>
      </section>

      {/* Email audit log */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Historique des emails</h2>
        <SmsLogTable logs={smsLogs} />
      </section>
    </div>
  );
}
