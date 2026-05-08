import { NextResponse } from 'next/server';
import twilio from 'twilio';
import {
  getSaturdayKey,
  createWeekendEvent,
  getWeekendState,
  deleteWeekendEvents,
  USERS,
} from '@/lib/google';

// ── Rotation : qui est de garde? ────────────────────────────────
// Ancre FIXE : samedi 21 mars 2026 = semaine 0 = Alex
// Ordre USERS : Alex(0) → Nathan(1) → Joey(2) → Elo(3)
const ANCHOR_DATE = '2026-03-21';

function computeGuardian(satDate: string) {
  const startMs = new Date(ANCHOR_DATE + 'T00:00:00Z').getTime();
  const satMs = new Date(satDate + 'T00:00:00Z').getTime();
  const weekIndex = Math.floor((satMs - startMs) / (7 * 24 * 60 * 60 * 1000));
  const userIndex = ((weekIndex % 4) + 4) % 4;
  return { guardian: USERS[userIndex], weekIndex, userIndex };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Vercel auto-cron → Authorization: Bearer <CRON_SECRET>
  // Déclenchement manuel → ?cron_secret=<CRON_SECRET>
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const querySecret = searchParams.get('cron_secret');
  const isAuthorized =
    bearerToken === process.env.CRON_SECRET ||
    querySecret === process.env.CRON_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // ?force=true  → supprime l'event existant et recrée le bon
  const force = searchParams.get('force') === 'true';

  try {
    const now = new Date();
    const satDate = getSaturdayKey(now);
    const { guardian, weekIndex, userIndex } = computeGuardian(satDate);

    console.log('[CRON] Rotation:', {
      satDate,
      anchor: ANCHOR_DATE,
      weekIndex,
      userIndex,
      expected: guardian.name,
      force,
    });

    // Vérifier si l'event existe déjà dans GCal pour ce weekend
    const existing = await getWeekendState(satDate);

    if (existing) {
      // Si l'event existe avec le BON gardien → rien à faire (sauf force)
      if (existing.guardian === guardian.name && !force) {
        return NextResponse.json({
          message: `Event déjà OK pour ${satDate} (${existing.guardian}, status: ${existing.status})`,
        });
      }

      // Event existe mais MAUVAIS gardien, ou force=true → supprimer et recréer
      console.log(
        `[CRON] ⚠ Event existant: ${existing.guardian} ≠ attendu: ${guardian.name}. Suppression...`
      );
      await deleteWeekendEvents(satDate);
    }

    // Créer l'event dans Google Calendar
    const state = await createWeekendEvent(satDate, guardian.name);

    // Envoyer le SMS via Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: guardian.phone,
        body: `Salut ${guardian.name}, c'est ton tour de gardiennage ce weekend! Réponds OUI ou NON.`,
      });
    } catch (smsError) {
      console.error('[CRON] SMS Twilio FAILED:', smsError);
      await notifyDiscord(
        `🚨 **Cron gardiennage — SMS NON envoyé**\n` +
        `Event GCal créé pour **${guardian.name}** (${satDate}) mais le SMS Twilio a planté.\n` +
        `Erreur: \`${String(smsError).slice(0, 300)}\`\n` +
        `→ Vérifie le TWILIO_AUTH_TOKEN sur Vercel.`
      );
      return NextResponse.json({
        message: `Event créé pour ${guardian.name} mais SMS échoué — notif Discord envoyée`,
        eventId: state.eventId,
        smsError: String(smsError),
      }, { status: 500 });
    }

    return NextResponse.json({
      message: `SMS envoyé à ${guardian.name} pour ${satDate}`,
      eventId: state.eventId,
      corrected: existing ? `Ancien event (${existing.guardian}) supprimé` : undefined,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    await notifyDiscord(
      `🚨 **Cron gardiennage — ERREUR FATALE**\n` +
      `Le cron a planté avant de pouvoir créer l'event ou envoyer le SMS.\n` +
      `Erreur: \`${String(error).slice(0, 300)}\``
    );
    return NextResponse.json(
      { message: 'Error', error: String(error) },
      { status: 500 }
    );
  }
}

async function notifyDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error('[CRON] Discord notify failed:', e);
  }
}
