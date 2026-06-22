import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { eventType, subject, topic, metadata } = body as {
      eventType: string;
      subject: string;
      topic: string;
      metadata?: any;
    };

    if (!eventType || !subject || !topic) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const event = await db.studyEvent.create({
      data: {
        userId,
        eventType,
        subject,
        topic,
        metadata: metadata ? JSON.stringify(metadata) : '',
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    console.error('Failed to log study event:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
