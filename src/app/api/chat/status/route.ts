// GET /api/chat/status — backend status for UI badge
import { NextResponse } from 'next/server';
import { getBackendStatus } from '@/lib/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getBackendStatus();
  return NextResponse.json(status);
}
