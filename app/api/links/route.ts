import { NextResponse } from 'next/server';
import { checkLinks } from '@/lib/link-checker';

export const maxDuration = 60;

export async function POST() {
  const result = await checkLinks(30);
  return NextResponse.json({ success: true, ...result });
}
