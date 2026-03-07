import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getSaturdayKey, createWeekendEvent, getWeekendState, USERS } from '@/lib/google';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cron_secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const satDate = getSaturdayKey(now);

    // Vérifier si l'event existe déjà dans GCal pour ce weekend
    const existing = await getWeekendState(satDate);
    if (existing) {
      return NextResponse.json({
        message: `Event déjà créé pour ${satDate} (${existing.guardian}, status: ${existing.status})`,
      });
    }

    // Calculer le gardien selon la rotation pure (vendredi = samedi-1)
    // On utilise USERS avec rotation basée sur la semaine courante
    // TEST: forcer Alex pour vérifier Google Calendar + SMS
    const guardian = USERS[0]; // Alex

    // Créer l'event dans Google Calendar
    const state = await createWeekendEvent(satDate, guardian.name);

    // Envoyer le SMS via Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: guardian.phone,
      body: `Salut ${guardian.name}, c'est ton tour de gardiennage ce weekend! Réponds OUI ou NON.`,
    });

    return NextResponse.json({
      message: `SMS sent to ${guardian.name}, event créé dans Google Calendar`,
      eventId: state.eventId,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { message: 'Error', error: String(error) },
      { status: 500 }
    );
  }
}
