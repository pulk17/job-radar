// Shared scan + notify pipeline used by /api/cron, /api/scan and the local scheduler.
import { runFullScan, ScanSummary } from './adapters/fetcher';
import { checkLinks } from './link-checker';
import { getUnnotifiedJobs, markNotified } from './db';
import { notifyNewJobs, notificationChannels } from './notify';

export interface ScanRunResult extends ScanSummary {
  notified: number;
  linksChecked: number;
  deadLinks: number;
}

export async function runScanAndNotify(): Promise<ScanRunResult> {
  const scan = await runFullScan();

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

  const links = await checkLinks(40);
  return { ...scan, notified, linksChecked: links.checked, deadLinks: links.dead };
}
