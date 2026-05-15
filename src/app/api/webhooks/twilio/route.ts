import twilio from 'twilio';
import { USERS, getWeekendState, setWeekendState, getSaturdayKey } from '@/lib/google';
import { addDays, format } from 'date-fns';
import { frCA } from 'date-fns/locale';

export const runtime = 'nodejs';

function formatWeekend(satDate: string): string {
  const sat = new Date(satDate + 'T12:00:00');
  const sun = addDays(sat, 1);
  const day1 = format(sat, 'd');
  const day2 = format(sun, 'd');
  const monthYear = format(sun, 'MMMM yyyy', { locale: frCA });
  return `${day1}-${day2} ${monthYear}`;
}

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

export async function POST(request: Request) {
  const twilioSignature = request.headers.get('X-Twilio-Signature') ?? '';
  const url = `https://gardiennage-calendar.vercel.app/api/webhooks/twilio`;
  const body = await request.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN ?? '',
    twilioSignature,
    url,
    params
  );

  if (!isValid) {
    return new Response('Forbidden', { status: 403 });
  }

  const from: string = params['From'] ?? '';
  const rawBody: string = (params['Body'] ?? '').trim().toUpperCase();
  const sender = USERS.find((u) => u.phone === from);

  const satDate = getSaturdayKey();
  const state = await getWeekendState(satDate);

  if (!state) {
    return twiml('Aucune garde active ce weekend.');
  }

  const isGuardian = sender?.phone === state.guardianPhone;

  // Gardien répond OUI → confirmer dans GCal + notif Discord
  if (isGuardian && rawBody === 'OUI') {
    await setWeekendState(satDate, { ...state, status: 'confirmed' });

    // Notif Discord — await sinon la lambda Vercel termine avant que fetch parte
    const discordUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
    if (discordUrl) {
      try {
        await fetch(discordUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `📋 **Gardiennage · Weekend du ${formatWeekend(satDate)}**\n✅ **${state.guardian}** a confirmé sa présence. La garde est assurée.`,
          }),
        });
      } catch (e) {
        console.error('[Discord] notify failed:', e);
      }
    }

    return twiml(`Parfait, merci ${state.guardian}! On compte sur toi ce weekend.`);
  }

  // Gardien répond NON → urgence immédiate + maj GCal
  if (isGuardian && rawBody === 'NON') {
    const now = new Date().toISOString();
    const response = twiml(`Compris ${state.guardian}, on cherche un remplaçant.`);

    // Arrière-plan: SMS urgents + maj GCal
    (async () => {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const others = USERS.filter((u) => u.phone !== state.guardianPhone);

        await Promise.all([
          ...others.map((u) =>
            client.messages.create({
              from: process.env.TWILIO_PHONE_NUMBER,
              to: u.phone,
              body: `URGENT: ${state.guardian} ne peut pas faire la garde ce weekend. Réponds OUI si tu peux le/la remplacer.`,
            })
          ),
          setWeekendState(satDate, {
            ...state,
            status: 'urgent',
            urgentSentAt: now,
          }),
        ]);
      } catch (err) {
        console.error('Erreur envoi urgence:', err);
      }
    })();

    return response;
  }

  // Quelqu'un répond OUI à l'urgence → remplaçant trouvé + maj GCal
  if (!isGuardian && rawBody === 'OUI' && sender) {
    if (state.status === 'urgent') {
      const response = twiml(`Merci ${sender.name}! T'es de garde ce weekend. On compte sur toi!`);

      (async () => {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await Promise.all([
            setWeekendState(satDate, {
              ...state,
              status: 'replaced',
              replacedBy: sender.name,
              replacedByPhone: sender.phone,
            }),
            client.messages.create({
              from: process.env.TWILIO_PHONE_NUMBER,
              to: state.guardianPhone,
              body: `${sender.name} a accepté de te remplacer ce weekend. Merci!`,
            }),
          ]);
        } catch (err) {
          console.error('Erreur remplacement:', err);
        }
      })();

      return response;
    }

    if (state.status === 'replaced') {
      return twiml(`Merci, mais ${state.replacedBy} a déjà accepté de faire la garde ce weekend.`);
    }
  }

  return twiml('Réponds OUI ou NON pour confirmer ta disponibilité.');
}
