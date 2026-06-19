// GET /api/models — list available AI models with capabilities
import { NextResponse } from 'next/server';
import { getModelsStatus } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = getModelsStatus();
  return NextResponse.json(status);
}
