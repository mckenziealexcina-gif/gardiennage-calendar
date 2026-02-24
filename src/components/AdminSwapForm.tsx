"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { swapUserOrder } from "@/actions/rotation.actions";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeftRight } from "lucide-react";

type User = { id: string; name: string; order: number };

type Props = {
  users: User[];
};

export function AdminSwapForm({ users }: Props) {
  const [userId1, setUserId1] = useState("");
  const [userId2, setUserId2] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSwap() {
    if (!userId1 || !userId2 || userId1 === userId2) {
      toast({
        title: "Erreur",
        description: "Sélectionnez deux utilisateurs différents.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await swapUserOrder(userId1, userId2);
      if (result.success) {
        toast({ title: "Ordre mis à jour", description: "La rotation a été mise à jour." });
        setUserId1("");
        setUserId2("");
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  }

  const sortedUsers = [...users].sort((a, b) => a.order - b.order);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Permuter deux positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ordre actuel :{" "}
          {sortedUsers.map((u) => u.name).join(" → ")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Position A</label>
            <Select value={userId1} onValueChange={setUserId1}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} (pos. {u.order + 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ArrowLeftRight className="w-4 h-4 text-muted-foreground mb-2.5 hidden sm:block" />

          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Position B</label>
            <Select value={userId2} onValueChange={setUserId2}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} (pos. {u.order + 1})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSwap}
            disabled={isPending || !userId1 || !userId2}
            className="sm:mb-0 w-full sm:w-auto"
          >
            {isPending ? "Mise à jour..." : "Permuter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
