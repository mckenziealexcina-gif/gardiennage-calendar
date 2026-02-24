import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getCurrentGuardian } from '@/lib/rotation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cron_secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const guardian = getCurrentGuardian();

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: guardian.phone,
      body: `Salut ${guardian.name}, c'est ton tour de gardiennage ce weekend!`,
    });

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
