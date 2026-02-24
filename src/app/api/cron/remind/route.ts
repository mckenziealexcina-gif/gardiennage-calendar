import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { USERS } from '@/lib/rotation';
import { getWeekendState, setWeekendState } from '@/lib/kv';
import { format, nextSaturday, isSaturday } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cron_secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const sat = isSaturday(now) ? now : nextSaturday(now);
    const satDate = format(sat, 'yyyy-MM-dd');

    const state = await getWeekendState(satDate);

    if (!state || state.status !== 'pending') {
      return NextResponse.json({
        message: `No action needed (status: ${state?.status ?? 'not found'})`,
      });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const others = USERS.filter((u) => u.phone !== state.guardianPhone);

    await Promise.all(
      others.map((u) =>
        client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER,
          to: u.phone,
          body: `URGENT: ${state.guardian} n'a pas confirmé sa présence ce weekend. Réponds OUI si tu peux le/la remplacer.`,
        })
      )
    );

    await setWeekendState(satDate, {
      ...state,
      status: 'urgent',
      urgentSentAt: now.toISOString(),
    });

    return NextResponse.json({
      message: `Urgent SMS sent to ${others.map((u) => u.name).join(', ')}`,
    });
  } catch (error) {
    console.error('Remind cron error:', error);
    return NextResponse.json(
      { message: 'Error sending urgent SMS' },
      { status: 500 }
    );
  }
}
