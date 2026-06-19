// GET /api/auth/me — get current user from session cookie
import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}
