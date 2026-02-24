"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setWeekendOverride,
  removeWeekendOverride,
} from "@/actions/rotation.actions";
import { toast } from "@/components/ui/use-toast";
import { format, addDays, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { getWeekSaturday } from "@/lib/rotation";
import { Trash2 } from "lucide-react";

type User = { id: string; name: string };
type Override = {
  id: string;
  weekStart: Date;
  userId: string;
  reason: string | null;
  user: User;
};

type Props = {
  users: User[];
  existingOverrides: Override[];
};

// Generate the next 13 weekend options for the select
function generateWeekendOptions() {
  const options: { label: string; isoDate: string }[] = [];
  const first = getWeekSaturday(new Date());
  for (let i = 0; i < 13; i++) {
    const sat = addWeeks(first, i);
    const sun = addDays(sat, 1);
    options.push({
      label: `${format(sat, "d MMM", { locale: fr })} – ${format(sun, "d MMM yyyy", { locale: fr })}`,
      isoDate: sat.toISOString(),
    });
  }
  return options;
}

export function AdminOverrideForm({ users, existingOverrides }: Props) {
  const [weekStartIso, setWeekStartIso] = useState("");
  const [userId, setUserId] = useState("");
  const [isPending, startTransition] = useTransition();

  const weekendOptions = generateWeekendOptions();

  function handleAdd() {
    if (!weekStartIso || !userId) {
      toast({
        title: "Erreur",
        description: "Sélectionnez un weekend et un utilisateur.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await setWeekendOverride(weekStartIso, userId);
      if (result.success) {
        toast({
          title: "Remplacement enregistré",
          description: "Le planning a été mis à jour.",
        });
        setWeekStartIso("");
        setUserId("");
      } else {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  function handleRemove(isoDate: string) {
    startTransition(async () => {
      const result = await removeWeekendOverride(isoDate);
      if (result.success) {
        toast({ title: "Remplacement supprimé" });
      } else {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un remplacement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Weekend</label>
              <Select value={weekStartIso} onValueChange={setWeekStartIso}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un weekend..." />
                </SelectTrigger>
                <SelectContent>
                  {weekendOptions.map((opt) => (
                    <SelectItem key={opt.isoDate} value={opt.isoDate}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">
                Remplaçant
              </label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAdd}
              disabled={isPending || !weekStartIso || !userId}
              className="w-full sm:w-auto"
            >
              {isPending ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {existingOverrides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Remplacements actifs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {existingOverrides.map((ov) => (
              <div
                key={ov.id}
                className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground capitalize">
                    {format(new Date(ov.weekStart), "d MMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                  <Badge variant="secondary">{ov.user.name}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handleRemove(new Date(ov.weekStart).toISOString())
                  }
                  disabled={isPending}
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
