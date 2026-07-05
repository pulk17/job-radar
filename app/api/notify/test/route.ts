import { NextResponse } from 'next/server';
import { sendTestNotification, notificationChannels } from '@/lib/notify';
import { markAllNotified } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ channels: notificationChannels() });
}

export async function POST() {
  const configured = notificationChannels();
  if (!configured.telegram && !configured.ntfy) {
    return NextResponse.json({
      success: false,
      error: 'No channel configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID and/or NTFY_TOPIC.',
      channels: configured,
    }, { status: 400 });
  }
  const result = await sendTestNotification();
  if (result.telegram || result.ntfy) {
    // Baseline: don't spam alerts for every job that already existed
    await markAllNotified();
  }
  return NextResponse.json({ success: result.telegram || result.ntfy, sent: result, channels: configured });
}
