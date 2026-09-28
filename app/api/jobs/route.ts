import { NextResponse } from 'next/server';
import { getAllJobs, getStats, getAvailableLanguages } from '@/lib/db';

// Ships the whole job set once; the client filters, sorts and counts it in memory,
// so changing a filter costs nothing and the stats always match the feed.
export async function GET() {
  const [jobs, stats, availableLanguages] = await Promise.all([
    getAllJobs(),
    getStats(),
    getAvailableLanguages(),
  ]);
  return NextResponse.json({ jobs, stats, availableLanguages });
}
