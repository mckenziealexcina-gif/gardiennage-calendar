import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { USERS } from '@/lib/rotation';
import { getWeekendState, setWeekendState } from '@/lib/kv';
import { format, nextSaturday, isSaturday } from 'date-fns';

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

export async function POST(request: Request) {
  // Validate Twilio signature
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

  // Find who replied
  const sender = USERS.find((u) => u.phone === from);

  // Get current weekend state
  const now = new Date();
  const sat = isSaturday(now) ? now : nextSaturday(now);
  const satDate = format(sat, 'yyyy-MM-dd');
  const state = await getWeekendState(satDate);

  if (!state) {
    return twiml("Aucune garde active ce weekend.");
  }

  const isGuardian = sender?.phone === state.guardianPhone;

  // Gardien répond OUI
  if (isGuardian && rawBody === 'OUI') {
    await setWeekendState(satDate, { ...state, status: 'confirmed' });
    return twiml(`Parfait, merci ${state.guardian}! On compte sur toi ce weekend.`);
  }

  // Gardien répond NON → déclenche urgence immédiate
  if (isGuardian && rawBody === 'NON') {
    await setWeekendState(satDate, { ...state, status: 'declined' });

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const others = USERS.filter((u) => u.phone !== state.guardianPhone);

    await Promise.all(
      others.map((u) =>
        client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: u.phone,
          body: `URGENT: ${state.guardian} ne peut pas faire la garde ce weekend. Réponds OUI si tu peux le/la remplacer.`,
        })
      )
    );

    await setWeekendState(satDate, {
      ...state,
      status: 'urgent',
      urgentSentAt: now.toISOString(),
    });

    return twiml(`Compris ${state.guardian}, on cherche un remplaçant.`);
  }

  // Quelqu'un répond OUI à l'urgence
  if (!isGuardian && rawBody === 'OUI' && sender) {
    if (state.status === 'urgent') {
      await setWeekendState(satDate, {
        ...state,
        status: 'replaced',
        replacedBy: sender.name,
        replacedByPhone: sender.phone,
      });

      // Notifier le gardien original
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: state.guardianPhone,
        body: `${sender.name} a accepté de te remplacer ce weekend. Merci!`,
      });

      return twiml(`Merci ${sender.name}! T'es de garde ce weekend. On compte sur toi!`);
    }

    if (state.status === 'replaced') {
      return twiml(`Merci, mais ${state.replacedBy} a déjà accepté de faire la garde ce weekend.`);
    }
  }

  return twiml("Réponds OUI ou NON pour confirmer ta disponibilité.");
}
