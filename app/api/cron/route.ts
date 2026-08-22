import { NextRequest, NextResponse } from 'next/server';
import { runScanAndNotify } from '@/lib/scan-runner';

// Triggered by GitHub Actions (every 30 min) or Vercel Cron (daily backstop).
// Protected by CRON_SECRET env var if set.
//
// Serverless platforms cap execution time (Vercel Hobby ≈ 60s), and a full pass
// over ~95 boards can exceed that. So cron runs are *budgeted and resumable*:
// each invocation scans as many companies as fit in SCAN_BUDGET_MS and stores a
// cursor, so consecutive runs cover everything instead of timing out at 504.

export const maxDuration = 60;

// Leaves room for the in-flight batch to land (ATS fetches abort at 12s) plus the
// link-check tail, inside maxDuration. Raise via SCAN_BUDGET_MS on a plan with a
// longer function limit.
const DEFAULT_BUDGET_MS = 30_000;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    const qs = url.searchParams.get('secret');
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const budgetMs = Number(url.searchParams.get('budgetMs'))
    || Number(process.env.SCAN_BUDGET_MS)
    || DEFAULT_BUDGET_MS;

  try {
    const r = await runScanAndNotify({
      resumable: true,
      budgetMs,
      // Link checks are optional work; skip them on tight budgets.
      checkLinksBatch: budgetMs >= 60_000 ? 40 : 8,
    });
    console.log(`[cron] scanned=${r.scanned}/${r.totalCompanies} new=${r.newJobsFound} notified=${r.notified} complete=${r.complete} nextCursor=${r.nextCursor}`);
    return NextResponse.json({
      success: true,
      scan: {
        scanned: r.scanned,
        totalCompanies: r.totalCompanies,
        newJobs: r.newJobsFound,
        complete: r.complete,
        nextCursor: r.nextCursor,
      },
      notified: r.notified,
      links: { checked: r.linksChecked, dead: r.deadLinks },
      errors: r.results.filter(x => x.error).map(x => ({ company: x.company, error: x.error })),
    });
  } catch (err) {
    console.error('[cron] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
