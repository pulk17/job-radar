import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs, getJobs, getStats, getAvailableLanguages } from '@/lib/db';

// Default mode ships the whole job set once and the client filters it in memory,
// so changing a filter costs nothing. `?server=1` keeps the old server-side
// filtering path available for scripts/CSV tooling.
export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;

  if (p.get('server') === '1') {
    const [jobs, stats, availableLanguages] = await Promise.all([
      getJobs({
        tier: p.get('tier') || 'all',
        search: p.get('search') || '',
        active: p.get('view') === 'active' ? true : p.get('view') === 'expired' ? false : undefined,
        bookmarked: p.get('view') === 'bookmarked' || undefined,
        statusFilter: p.get('view') === 'applied' ? 'applied_any' : 'all',
        roleType: p.get('roleType') || 'all',
        region: p.get('region') || 'all',
        languages: p.get('languages') ? p.get('languages')!.split(',').filter(Boolean) : undefined,
        sort: p.get('sort') || 'score',
        order: p.get('order') || 'desc',
      }),
      getStats(),
      getAvailableLanguages(),
    ]);
    return NextResponse.json({ jobs, stats, availableLanguages });
  }

  const [jobs, stats, availableLanguages] = await Promise.all([
    getAllJobs(),
    getStats(),
    getAvailableLanguages(),
  ]);
  return NextResponse.json({ jobs, stats, availableLanguages });
}
