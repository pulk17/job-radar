export async function register() {
  // The in-process scheduler is for self-hosted/Docker runs. On Vercel it can
  // never fire (serverless), and in local dev it competes with manual scans for
  // the SQLite file — so it stays off unless explicitly enabled.
  const enabled = process.env.ENABLE_LOCAL_CRON === '1'
    || (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1');

  if (process.env.NEXT_RUNTIME === 'nodejs' && enabled) {
    const { startScheduler } = await import('./lib/cron');
    startScheduler();
  }
}
