import { NextResponse } from 'next/server';
import { HIRING_CALENDAR, getActiveWindows, getUpcomingWindows, getCurrentMonth } from '@/lib/hiring-calendar';

export async function GET() {
  return NextResponse.json({
    currentMonth: getCurrentMonth(),
    all: HIRING_CALENDAR,
    activeNow: getActiveWindows(),
    upcoming: getUpcomingWindows(),
  });
}
