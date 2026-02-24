import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getCurrentGuardian } from '@/lib/rotation';
import { getSaturdayKey, setWeekendState } from '@/lib/kv';
import { format, nextSaturday, isSaturday } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cron_secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const guardian = getCurrentGuardian();
    const now = new Date();
    const sat = isSaturday(now) ? now : nextSaturday(now);
    const satDate = format(sat, 'yyyy-MM-dd');

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: guardian.phone,
      body: `Salut ${guardian.name}, c'est ton tour de gardiennage ce weekend! Réponds OUI ou NON.`,
    });

    try {
      await setWeekendState(satDate, {
        weekendDate: satDate,
        guardian: guardian.name,
        guardianPhone: guardian.phone,
        status: 'pending',
        sentAt: now.toISOString(),
      });
    } catch (kvErr) {
      console.warn('KV unavailable, state not saved:', kvErr);
    }

    return NextResponse.json({
      message: `SMS sent to ${guardian.name}`,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { message: 'Error sending SMS' },
      { status: 500 }
    );
  }
}
