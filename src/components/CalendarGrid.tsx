import { WeekendCard } from "./WeekendCard";
import type { RotationUser } from "@/lib/rotation";

type Weekend = {
  weekStart: Date;
  user: RotationUser;
  isOverride: boolean;
};

type Props = {
  weekends: Weekend[];
};

export function CalendarGrid({ weekends }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {weekends.map((w) => (
        <WeekendCard
          key={w.weekStart.toISOString()}
          weekStart={w.weekStart}
          user={w.user}
          isOverride={w.isOverride}
        />
      ))}
    </div>
  );
}
