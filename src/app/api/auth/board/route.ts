// POST /api/auth/board — update user's board preference (ICSE/CBSE)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { board } = await req.json();
    if (!board || !['ICSE', 'CBSE'].includes(board)) {
      return NextResponse.json({ error: 'Board must be ICSE or CBSE' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { board },
      select: { id: true, email: true, name: true, board: true, className: true }
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
