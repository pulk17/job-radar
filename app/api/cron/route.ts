import { NextRequest, NextResponse } from 'next/server';
import { runScanAndNotify } from '@/lib/scan-runner';

// Triggered by GitHub Actions (every 30 min) or Vercel Cron (daily backstop).
// Protected by CRON_SECRET env var if set.

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    const qs = new URL(req.url).searchParams.get('secret');
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const r = await runScanAndNotify();
    console.log(`[Cron API] scan=${r.scanned} new=${r.newJobsFound} notified=${r.notified} links=${r.linksChecked} (${r.deadLinks} dead)`);
    return NextResponse.json({
      success: true,
      scan: { scanned: r.scanned, newJobs: r.newJobsFound },
      notified: r.notified,
      links: { checked: r.linksChecked, dead: r.deadLinks },
    });
  } catch (err) {
    console.error('[Cron API] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
