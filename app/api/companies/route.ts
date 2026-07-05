import { NextResponse } from 'next/server';
import { COMPANIES } from '@/lib/companies';
import { getCompanyScanStatus } from '@/lib/db';

// Coverage panel: every tracked company + how its scans are going.
export async function GET() {
  const statuses = await getCompanyScanStatus();
  const byName = new Map(statuses.map(s => [s.company, s]));
  const companies = COMPANIES.filter(c => c.enabled).map(c => {
    const s = byName.get(c.name);
    return {
      name: c.name,
      tier: c.tier,
      location: c.location,
      salary: c.salary,
      careersUrl: c.careersUrl,
      ats: c.ats,
      scannable: c.ats !== 'custom',
      verified: c.verified || null,
      lastScanAt: s?.lastScanAt || null,
      lastError: s?.lastError || null,
      totalJobs: s?.totalJobs ?? null,
      lastNewJobAt: s?.lastNewJobAt || null,
    };
  });
  return NextResponse.json({ companies });
}
