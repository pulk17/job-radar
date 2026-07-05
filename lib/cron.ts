// Local/self-hosted scheduler. On Vercel this never fires (serverless);
// there the GitHub Actions workflow + /api/cron endpoint drive scans instead.
let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  const everyMin = Number(process.env.SCAN_INTERVAL_MINUTES || 0);
  // Default: every 45 min between 6:00-23:00 IST + one 6:00 AM full pass
  const expr = everyMin > 0 ? `*/${everyMin} * * * *` : '*/45 * * * *';

  import('node-cron').then((cron) => {
    cron.default.schedule(expr, async () => {
      console.log('[Cron] Starting scheduled scan...');
      try {
        const { runScanAndNotify } = await import('./scan-runner');
        const r = await runScanAndNotify();
        console.log(`[Cron] Scan done: ${r.scanned} companies, ${r.newJobsFound} new, notified=${r.notified}`);
      } catch (err) {
        console.error('[Cron] task error:', err);
      }
    });
    console.log(`[Scheduler] Auto-scan enabled (cron: ${expr})`);
  }).catch(err => {
    console.error('[Scheduler] Failed to load node-cron:', err);
  });
}
