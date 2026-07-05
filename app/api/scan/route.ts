import { NextResponse } from 'next/server';
import { runScanAndNotify } from '@/lib/scan-runner';

export const maxDuration = 300;

export async function POST() {
  const result = await runScanAndNotify();
  return NextResponse.json({
    success: true,
    scanned: result.scanned,
    newJobsFound: result.newJobsFound,
    notified: result.notified,
    results: result.results,
  });
}
