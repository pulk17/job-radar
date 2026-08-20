import { NextResponse } from 'next/server';
import { runScanAndNotify } from '@/lib/scan-runner';

// Manual "Scan All" — always does a complete pass (no cursor, no budget).
// Self-hosted/local only concern: on Vercel this may exceed the function limit,
// which is why the automated path (/api/cron) is budgeted and resumable.
export const maxDuration = 300;

export async function POST() {
  const result = await runScanAndNotify();
  return NextResponse.json({
    success: true,
    scanned: result.scanned,
    totalCompanies: result.totalCompanies,
    newJobsFound: result.newJobsFound,
    notified: result.notified,
    results: result.results,
  });
}
