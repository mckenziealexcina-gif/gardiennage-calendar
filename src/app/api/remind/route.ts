import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getSaturdayKey, getWeekendState } from '@/lib/google';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const querySecret = searchParams.get('cron_secret');
  const isAuthorized =
    bearerToken === process.env.CRON_SECRET ||
    querySecret === process.env.CRON_SECRET;

  if (!isAuthorized) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const satDate = getSaturdayKey(new Date());
    const state = await getWeekendState(satDate);

    if (!state) {
      return NextResponse.json(
        { message: `Aucun event trouvé pour ${satDate}. Lance /api/cron d'abord.` },
        { status: 404 }
      );
    }

    if (state.status !== 'pending') {
      return NextResponse.json({
        message: `Pas de rappel envoyé — ${state.guardian} a déjà répondu (status: ${state.status}).`,
      });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: state.guardianPhone,
      body: `Salut ${state.guardian}, petit rappel — peux-tu confirmer OUI ou NON pour le gardiennage ce weekend ?`,
    });

    return NextResponse.json({
      message: `Rappel envoyé à ${state.guardian} (${state.guardianPhone}) pour ${satDate}`,
    });
  } catch (error) {
    console.error('Remind error:', error);
    return NextResponse.json(
      { message: 'Error', error: String(error) },
      { status: 500 }
    );
  }
}
