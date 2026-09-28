import { NextRequest, NextResponse } from 'next/server';
import { getPublicKey, isValidSubscription, sendPush } from '@/lib/push';
import { notificationChannels, sendTestNotification, anyChannel } from '@/lib/notify';
import { savePushSubscription, deletePushSubscription, markAllNotified } from '@/lib/db';

// GET    → VAPID public key + which channels are live
// POST   { subscription } → register this device, then send it a confirmation
// POST   { test: true }   → test message to every channel
// DELETE { endpoint }     → unregister this device
export async function GET() {
  const [publicKey, channels] = await Promise.all([getPublicKey(), notificationChannels()]);
  return NextResponse.json({ publicKey, channels });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.test) {
    const channels = await notificationChannels();
    if (!anyChannel(channels)) {
      return NextResponse.json({ success: false, error: 'No device has alerts enabled yet.' }, { status: 400 });
    }
    const sent = await sendTestNotification();
    return NextResponse.json({ success: sent.push > 0 || sent.telegram || sent.ntfy, sent });
  }

  const sub = body.subscription;
  if (!isValidSubscription(sub)) {
    return NextResponse.json({ success: false, error: 'Invalid push subscription' }, { status: 400 });
  }
  const row = { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  await savePushSubscription(row);
  // Baseline: alerts are for roles that appear from now on, not the existing backlog.
  await markAllNotified();
  const delivered = await sendPush({
    title: 'Alerts are on ✓',
    body: 'You\'ll get a ping when new internships and new-grad roles appear.',
    url: '/', tag: 'welcome',
  }, row);
  return NextResponse.json({ success: true, delivered: delivered > 0 });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint === 'string') await deletePushSubscription(endpoint);
  return NextResponse.json({ success: true });
}
