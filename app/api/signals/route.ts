import { NextRequest, NextResponse } from 'next/server';
import { dismissSignal, listSignals, refreshSignals } from '@/lib/signals';

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ signals: await listSignals() });
}

export async function POST(req: NextRequest) {
  const { action, id } = await req.json();
  if (action === 'dismiss' && id) await dismissSignal(id);
  else if (action === 'refresh') return NextResponse.json({ ...(await refreshSignals()), signals: await listSignals() });
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  return NextResponse.json({ success: true });
}
