import { google } from 'googleapis';
import { format, nextSaturday, isSaturday, addDays } from 'date-fns';

// Même structure que WeekendState dans kv.ts
export interface WeekendState {
  weekendDate: string;       // "2026-02-28" (samedi)
  guardian: string;          // "Alex"
  guardianPhone: string;     // "+15817457623"
  status: 'pending' | 'confirmed' | 'declined' | 'urgent' | 'replaced';
  sentAt: string;
  urgentSentAt?: string;
  replacedBy?: string;
  replacedByPhone?: string;
  eventId: string;           // Google Calendar event ID
}

// Mapping nom → téléphone
export const USERS: { name: string; phone: string }[] = [
  { name: 'Alex',   phone: '+15817457623' },
  { name: 'Joey',   phone: '+15819903681' },
  { name: 'Elo',    phone: '+14182646318' },
  { name: 'Nathan', phone: '+15813099142' },
];

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

// Convertit le titre d'un event GCal en WeekendState
// Format titre: "Gardiennage: Alex | pending"
// ou après mise à jour: "Gardiennage: Alex | confirmed"
function parseTitleToState(
  title: string,
  eventId: string,
  description: string
): WeekendState | null {
  const match = title.match(/^Gardiennage:\s*(\w+)\s*\|\s*(\w+)$/i);
  if (!match) return null;

  const name = match[1];
  const status = match[2] as WeekendState['status'];
  const user = USERS.find((u) => u.name.toLowerCase() === name.toLowerCase());
  if (!user) return null;

  // Lire les métadonnées depuis la description JSON
  let meta: Partial<WeekendState> = {};
  try {
    meta = JSON.parse(description ?? '{}');
  } catch {}

  return {
    weekendDate: meta.weekendDate ?? '',
    guardian: user.name,
    guardianPhone: user.phone,
    status,
    sentAt: meta.sentAt ?? new Date().toISOString(),
    urgentSentAt: meta.urgentSentAt,
    replacedBy: meta.replacedBy,
    replacedByPhone: meta.replacedByPhone,
    eventId,
  };
}

function buildTitle(guardian: string, status: WeekendState['status']): string {
  return `Gardiennage: ${guardian} | ${status}`;
}

// Trouver l'event du weekend courant dans GCal
export async function getWeekendState(satDate: string): Promise<WeekendState | null> {
  const calendar = getCalendar();
  const sat = new Date(satDate + 'T00:00:00');
  const sun = addDays(sat, 1);

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: sat.toISOString(),
    timeMax: addDays(sun, 1).toISOString(),
    q: 'Gardiennage:',
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items ?? [];
  if (events.length === 0) return null;

  const event = events[0];
  return parseTitleToState(
    event.summary ?? '',
    event.id ?? '',
    event.description ?? ''
  );
}

// Créer ou mettre à jour les events sam+dim dans GCal
export async function setWeekendState(satDate: string, state: WeekendState): Promise<void> {
  const calendar = getCalendar();
  const sunDate = format(addDays(new Date(satDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
  const color = statusToColorId(state.status);
  const description = JSON.stringify({
    weekendDate: state.weekendDate,
    sentAt: state.sentAt,
    urgentSentAt: state.urgentSentAt,
    replacedBy: state.replacedBy,
    replacedByPhone: state.replacedByPhone,
  });
  const summary = buildTitle(state.guardian, state.status);

  // Trouver tous les events Gardiennage du weekend (sam + dim)
  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: new Date(satDate + 'T00:00:00').toISOString(),
    timeMax: new Date(sunDate + 'T23:59:59').toISOString(),
    q: 'Gardiennage:',
    singleEvents: true,
  });

  const events = res.data.items ?? [];

  await Promise.all(events.map((event) => {
    const issat = event.start?.dateTime?.startsWith(satDate) || event.start?.date === satDate;
    const startDate = issat ? satDate : sunDate;
    return calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: event.id!,
      requestBody: {
        summary,
        description,
        start: { dateTime: `${startDate}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${startDate}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: color,
      },
    });
  }));
}

// Créer l'event initial (depuis le cron du vendredi)
export async function createWeekendEvent(satDate: string, guardian: string): Promise<WeekendState> {
  const calendar = getCalendar();
  const sun = addDays(new Date(satDate + 'T00:00:00'), 1);
  const sunDate = format(sun, 'yyyy-MM-dd');
  const user = USERS.find((u) => u.name === guardian)!;
  const now = new Date().toISOString();

  // Créer 2 events: samedi 8h30-17h00 et dimanche 8h30-17h00 (America/Toronto)
  const [resSat, _resSun] = await Promise.all([
    calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: buildTitle(guardian, 'pending'),
        description: JSON.stringify({ weekendDate: satDate, sentAt: now }),
        start: { dateTime: `${satDate}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${satDate}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: statusToColorId('pending'),
      },
    }),
    calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: buildTitle(guardian, 'pending'),
        description: JSON.stringify({ weekendDate: satDate, sentAt: now }),
        start: { dateTime: `${sunDate}T08:30:00`, timeZone: 'America/Toronto' },
        end:   { dateTime: `${sunDate}T17:00:00`, timeZone: 'America/Toronto' },
        colorId: statusToColorId('pending'),
      },
    }),
  ]);

  return {
    weekendDate: satDate,
    guardian: user.name,
    guardianPhone: user.phone,
    status: 'pending',
    sentAt: now,
    eventId: resSat.data.id ?? '',
  };
}

// Calculer la date du samedi du weekend courant
export function getSaturdayKey(from: Date = new Date()): string {
  const sat = isSaturday(from) ? from : nextSaturday(from);
  return format(sat, 'yyyy-MM-dd');
}

// Couleurs Google Calendar selon statut
function statusToColorId(status: WeekendState['status']): string {
  switch (status) {
    case 'confirmed': return '2';  // Vert sauge
    case 'replaced':  return '2';  // Vert sauge
    case 'urgent':
    case 'declined':  return '11'; // Tomate/rouge
    case 'pending':
    default:          return '5';  // Banane/jaune
  }
}

// Récupérer les prochains weekends depuis GCal (pour la page d'accueil)
export async function getUpcomingWeekends(count: number = 4): Promise<WeekendState[]> {
  const calendar = getCalendar();
  const now = new Date();

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    timeMin: now.toISOString(),
    maxResults: count,
    q: 'Gardiennage:',
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items ?? [];
  const results: WeekendState[] = [];

  for (const event of events) {
    const state = parseTitleToState(
      event.summary ?? '',
      event.id ?? '',
      event.description ?? ''
    );
    if (state) results.push(state);
  }

  return results;
}
