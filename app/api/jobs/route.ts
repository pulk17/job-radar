import { NextRequest, NextResponse } from 'next/server';
import { getJobs, getStats, getAvailableLanguages } from '@/lib/db';

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
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
