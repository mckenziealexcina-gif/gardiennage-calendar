/**
 * Fix weekend 4-5 avril 2026
 * 1. Supprime les events "Gardiennage: Alex" (envoyés par erreur)
 * 2. Crée les events "Gardiennage: Joey | pending" (sam + dim)
 * 3. Envoie le SMS à Joey
 *
 * Usage:  npx tsx scripts/fix-joey-apr4.ts
 * Besoin: .env avec GOOGLE_*, TWILIO_*, GOOGLE_CALENDAR_ID
 */

import { google } from 'googleapis';
import twilio from 'twilio';

const SAT_DATE = '2026-04-04';
const SUN_DATE = '2026-04-05';
const JOEY = { name: 'Joey', phone: '+15819903681' };

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

async function main() {
  const calendar = google.calendar({ version: 'v3', auth: getAuth() });
  const calId = process.env.GOOGLE_CALENDAR_ID!;

  // ── 1. Supprimer tous les events Gardiennage de ce weekend ────────────
  const res = await calendar.events.list({
    calendarId: calId,
    timeMin: new Date(SAT_DATE + 'T00:00:00').toISOString(),
    timeMax: new Date(SUN_DATE + 'T23:59:59').toISOString(),
    q: 'Gardiennage:',
    singleEvents: true,
  });

  const events = res.data.items ?? [];
  console.log(`🗑  Suppression de ${events.length} event(s) existant(s)...`);
  for (const ev of events) {
    await calendar.events.delete({ calendarId: calId, eventId: ev.id! });
    console.log(`   Supprimé: ${ev.summary}`);
  }

  // ── 2. Créer 2 events pour Joey (sam 8h30-17h + dim 8h30-17h) ────────
  const now = new Date().toISOString();
  const description = JSON.stringify({ weekendDate: SAT_DATE, sentAt: now });
  const summary = `Gardiennage: ${JOEY.name} | pending`;

  const [satEvent, sunEvent] = await Promise.all([
    calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${SAT_DATE}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${SAT_DATE}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: '5', // jaune = pending
      },
    }),
    calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${SUN_DATE}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${SUN_DATE}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: '5',
      },
    }),
  ]);

  console.log(`✅ Events créés pour ${JOEY.name}:`);
  console.log(`   Sam: ${satEvent.data.id}`);
  console.log(`   Dim: ${sunEvent.data.id}`);

  // ── 3. Envoyer SMS à Joey ─────────────────────────────────────────────
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: JOEY.phone,
    body: `Salut ${JOEY.name}, c'est ton tour de gardiennage ce weekend! Réponds OUI ou NON.`,
  });
  console.log(`📱 SMS envoyé à ${JOEY.name} (${JOEY.phone})`);

  console.log('\n🎉 Terminé! Joey est maintenant de garde pour le weekend du 4-5 avril.');
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
