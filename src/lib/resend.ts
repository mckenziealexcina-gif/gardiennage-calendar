import { Resend } from "resend";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { RotationUser } from "./rotation";

export type EmailResult = {
  success: boolean;
  id?: string;
  error?: string;
};

const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * Sends a French-language gardiennage reminder email via Resend.
 *
 * Example subject: "Gardiennage ce weekend — 25 jan."
 */
export async function sendEmailReminder(
  user: RotationUser,
  weekStart: Date
): Promise<EmailResult> {
  const saturday = format(weekStart, "EEEE d MMMM", { locale: fr });
  const sunday = format(addDays(weekStart, 1), "EEEE d MMMM", { locale: fr });

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: user.phone, // User.phone stores the email address
      subject: `Gardiennage ce weekend — ${format(weekStart, "d MMM", { locale: fr })}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1e293b">Rappel de gardiennage</h2>
          <p>Bonjour <strong>${user.name}</strong>,</p>
          <p>Vous êtes de gardiennage ce weekend :</p>
          <p style="font-size:1.2em;font-weight:bold;color:#3b82f6">
            ${saturday}<br>${sunday}
          </p>
          <p>Bonne garde !</p>
        </div>
      `,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown Resend error";
    console.error("Resend email failed:", error);
    return { success: false, error };
  }
}
