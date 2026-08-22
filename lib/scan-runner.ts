// Shared scan + notify pipeline used by /api/cron, /api/scan and the local scheduler.
import { runFullScan, ScanSummary, ScanOptions } from './adapters/fetcher';
import { checkLinks } from './link-checker';
import { getUnnotifiedJobs, markNotified, getMeta, setMeta } from './db';
import { notifyNewJobs, notificationChannels } from './notify';

const CURSOR_KEY = 'scan_cursor';

// Only one scan may run per process. Overlapping scans (e.g. the local
// scheduler firing while a manual "Scan All" is in flight) hammer the same
// SQLite file and slow each other to a crawl, so late callers join the
// in-flight run instead of starting a second one.
let inFlight: Promise<ScanRunResult> | null = null;

export function isScanning(): boolean {
  return inFlight !== null;
}

export interface ScanRunResult extends ScanSummary {
  notified: number;
  linksChecked: number;
  deadLinks: number;
}

export interface RunOptions extends ScanOptions {
  /** Resume from the stored cursor and persist the next one (used by cron) */
  resumable?: boolean;
  /** Skip the link-check pass when the budget is tight */
  checkLinksBatch?: number;
}

export function runScanAndNotify(opts: RunOptions = {}): Promise<ScanRunResult> {
  if (inFlight) return inFlight;
  inFlight = doScan(opts).finally(() => { inFlight = null; });
  return inFlight;
}

async function doScan(opts: RunOptions): Promise<ScanRunResult> {
  const { resumable = false, budgetMs = 0, checkLinksBatch = 40 } = opts;
  const startedAt = Date.now();

  let cursor = opts.cursor ?? 0;
  if (resumable && opts.cursor === undefined) {
    cursor = Number(await getMeta(CURSOR_KEY)) || 0;
  }

  // Reserve the tail of the budget for link checks, otherwise the scan eats the
  // whole thing and they never run.
  const linkReserveMs = checkLinksBatch > 0 ? Math.min(8000, checkLinksBatch * 1500) : 0;
  const scanBudget = budgetMs > 0 ? Math.max(5000, budgetMs - linkReserveMs) : 0;
  const scan = await runFullScan({ budgetMs: scanBudget, cursor });
  if (resumable) await setMeta(CURSOR_KEY, String(scan.nextCursor));

  // Notify from the DB (notified_at IS NULL) rather than only this scan's
  // in-memory list, so jobs missed during a failed notification are retried.
  let notified = 0;
  const channels = notificationChannels();
  if (channels.telegram || channels.ntfy) {
    const pending = await getUnnotifiedJobs(0.25, 40);
    if (pending.length > 0) {
      const ok = await notifyNewJobs(
        pending.map(j => ({
          company: j.company, title: j.title, location: j.location || '',
          applyUrl: j.apply_url, score: j.match_score, roleType: j.role_type, region: j.region,
        })),
        process.env.APP_URL
      );
      if (ok) {
        await markNotified(pending.map(j => j.id));
        notified = pending.length;
      }
    }
  }

  // Link checking is the optional tail of the run. It used to start no matter how
  // long the scan took, which is how a budgeted run still hit the platform timeout —
  // so it only gets whatever the scan actually left (~1.5s per link, 5 at a time).
  const leftMs = budgetMs > 0 ? budgetMs - (Date.now() - startedAt) : Infinity;
  const batch = Math.min(checkLinksBatch, Math.floor(leftMs / 1500));
  const links = batch > 0 ? await checkLinks(batch) : { checked: 0, dead: 0 };
  return { ...scan, notified, linksChecked: links.checked, deadLinks: links.dead };
}
