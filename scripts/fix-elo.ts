import { google } from 'googleapis';
import twilio from 'twilio';

const SAT_DATE = '2026-03-14';
const SUN_DATE = '2026-03-15';
const ELO = { name: 'Elo', phone: '+14182646318' };

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

  // 1. Supprimer tous les events Gardiennage du weekend 14-15 mars
  const res = await calendar.events.list({
    calendarId: calId,
    timeMin: new Date(SAT_DATE + 'T00:00:00').toISOString(),
    timeMax: new Date(SUN_DATE + 'T23:59:59').toISOString(),
    q: 'Gardiennage:',
    singleEvents: true,
  });

  const events = res.data.items ?? [];
  console.log(`Suppression de ${events.length} event(s) existant(s)...`);
  for (const ev of events) {
    await calendar.events.delete({ calendarId: calId, eventId: ev.id! });
    console.log(`  Supprimé: ${ev.summary}`);
  }

  // 2. Créer 2 nouveaux events pour Elo (sam + dim) en jaune (pending)
  const now = new Date().toISOString();
  const description = JSON.stringify({ weekendDate: SAT_DATE, sentAt: now });
  const summary = `Gardiennage: ${ELO.name} | pending`;

  await Promise.all([
    calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${SAT_DATE}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${SAT_DATE}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: '5', // jaune
      },
    }),
    calendar.events.insert({
      calendarId: calId,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${SUN_DATE}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${SUN_DATE}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: '5', // jaune
      },
    }),
  ]);
  console.log('Events Elo créés dans Google Calendar (jaune/pending)');

  // 3. Envoyer SMS à Elo
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: ELO.phone,
    body: `Salut ${ELO.name}, c'est ton tour de gardiennage ce weekend! Réponds OUI ou NON.`,
  });
  console.log(`SMS envoyé à ${ELO.name} (${ELO.phone})`);
}

main().catch(console.error);
