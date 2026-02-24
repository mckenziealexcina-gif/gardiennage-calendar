import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getCurrentGuardian } from '@/lib/rotation';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cron_secret');

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const guardian = getCurrentGuardian();

    await resend.emails.send({
      from: 'onboarding@resend.dev', // A default verified sender
      to: guardian.email,
      subject: 'Rappel Gardiennage',
      text: "C'est ton tour ce weekend!",
    });

    return NextResponse.json({
      message: `Reminder sent to ${guardian.name}`,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { message: 'Error sending reminder' },
      { status: 500 }
    );
  }
}
