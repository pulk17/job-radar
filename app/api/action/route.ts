import { NextRequest, NextResponse } from 'next/server';
import { toggleBookmark, setStatus, setNotes } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, action, status, notes } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (action === 'bookmark') {
    await toggleBookmark(id);
  } else if (action === 'status' && status) {
    await setStatus(id, status);
  } else if (action === 'notes' && notes !== undefined) {
    await setNotes(id, notes);
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
