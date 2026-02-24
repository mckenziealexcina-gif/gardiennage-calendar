import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type SmsLogEntry = {
  id: string;
  userName: string;
  phone: string;
  weekStart: Date;
  sentAt: Date;
  status: string;
  messageId: string | null;
};

type Props = {
  logs: SmsLogEntry[];
};

export function SmsLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun email envoyé pour le moment.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Weekend</th>
            <th className="text-left px-4 py-3 font-medium">Destinataire</th>
            <th className="text-left px-4 py-3 font-medium">Envoyé le</th>
            <th className="text-left px-4 py-3 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t hover:bg-muted/20">
              <td className="px-4 py-3 capitalize">
                {format(new Date(log.weekStart), "d MMM yyyy", { locale: fr })}
              </td>
              <td className="px-4 py-3">{log.userName}</td>
              <td className="px-4 py-3">
                {format(new Date(log.sentAt), "d MMM yyyy HH:mm", { locale: fr })}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={log.status === "sent" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {log.status === "sent" ? "Envoyé" : "Échec"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
