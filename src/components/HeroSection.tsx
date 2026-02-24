import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield } from "lucide-react";
import type { RotationUser } from "@/lib/rotation";

const USER_COLORS: Record<string, string> = {
  Alex: "text-blue-500",
  Joey: "text-green-500",
  Elo: "text-purple-500",
  Nathan: "text-orange-500",
};

type Props = {
  currentUser: RotationUser;
  weekStart: Date;
};

export function HeroSection({ currentUser, weekStart }: Props) {
  const nameColor = USER_COLORS[currentUser.name] ?? "text-primary";
  const saturday = format(weekStart, "EEEE d MMMM", { locale: fr });
  const sunday = format(addDays(weekStart, 1), "EEEE d MMMM", { locale: fr });

  return (
    <section className="bg-muted/40 border-b">
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="flex justify-center mb-4">
          <Shield className="w-12 h-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm uppercase tracking-widest font-medium">
          Cette semaine
        </p>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight">
          <span className={nameColor}>{currentUser.name}</span>
        </h1>
        <p className="text-muted-foreground text-base capitalize">
          {saturday} — {sunday}
        </p>
      </div>
    </section>
  );
}
