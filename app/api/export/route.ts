import { NextResponse } from 'next/server';
import { exportJobsCsv } from '@/lib/db';

export async function GET() {
  const csv = await exportJobsCsv();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="job-radar-export.csv"',
    },
  });
}
