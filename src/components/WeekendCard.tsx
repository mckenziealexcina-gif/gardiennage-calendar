import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, isThisWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { RotationUser } from "@/lib/rotation";

const USER_COLORS: Record<string, string> = {
  Alex: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Joey: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Elo: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Nathan:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

type Props = {
  weekStart: Date;
  user: RotationUser;
  isOverride: boolean;
};

export function WeekendCard({ weekStart, user, isOverride }: Props) {
  const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 6 });
  const dateLabel =
    format(weekStart, "d MMM", { locale: fr }) +
    " – " +
    format(addDays(weekStart, 1), "d MMM yyyy", { locale: fr });

  const colorClasses =
    USER_COLORS[user.name] ?? "bg-muted text-muted-foreground";

  return (
    <Card className={isCurrentWeek ? "ring-2 ring-primary" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
          {dateLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`text-lg font-bold px-3 py-1 rounded-full ${colorClasses}`}
        >
          {user.name}
        </span>
        <div className="flex gap-1">
          {isCurrentWeek && <Badge className="text-xs">Actuellement</Badge>}
          {isOverride && (
            <Badge variant="secondary" className="text-xs">
              Remplacement
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
