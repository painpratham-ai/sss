import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';

// 1. GET /api/timetable — Fetch all slots
export async function GET() {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const slots = await db.timetableSlot.findMany({
      where: { userId },
      orderBy: [
        { dayOfWeek: 'asc' },
        { timeStart: 'asc' }
      ]
    });

    return NextResponse.json({ slots });
  } catch (err: any) {
    console.error('Failed to fetch timetable slots:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST /api/timetable — Add custom slot
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();

    // Support for bulk remediation slots from Mock Exams
    if (body.remediationTopics && Array.isArray(body.remediationTopics)) {
      const slots: any[] = [];
      let dayIndex = new Date().getDay(); // Start scheduling from today
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (const rt of body.remediationTopics) {
        const slot = await db.timetableSlot.create({
          data: {
            userId,
            subject: rt.subject || 'Revision',
            topic: `Remediation: ${rt.topic}`,
            dayOfWeek: days[dayIndex % 7],
            timeStart: '18:00',
            timeEnd: '19:00',
            completed: false
          }
        });
        slots.push(slot);
        dayIndex++; // Schedule next topic on the next day
      }
      return NextResponse.json({ success: true, slots });
    }

    // Standard single slot creation
    const { subject, topic, dayOfWeek, timeStart, timeEnd } = body as {
      subject: string;
      topic: string;
      dayOfWeek: string;
      timeStart: string;
      timeEnd: string;
    };

    if (!subject || !topic || !dayOfWeek || !timeStart || !timeEnd) {
      return NextResponse.json({ error: 'Missing required slot fields' }, { status: 400 });
    }

    const slot = await db.timetableSlot.create({
      data: {
        userId,
        subject,
        topic,
        dayOfWeek,
        timeStart,
        timeEnd,
        completed: false
      }
    });

    return NextResponse.json({ success: true, slot });
  } catch (err: any) {
    console.error('Failed to create timetable slot:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PUT /api/timetable — Toggle completion or update slot
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { id, completed, subject, topic, dayOfWeek, timeStart, timeEnd } = body as {
      id: string;
      completed?: boolean;
      subject?: string;
      topic?: string;
      dayOfWeek?: string;
      timeStart?: string;
      timeEnd?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    const existing = await db.timetableSlot.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Slot not found or unauthorized' }, { status: 404 });
    }

    const updated = await db.timetableSlot.update({
      where: { id },
      data: {
        completed: completed !== undefined ? completed : existing.completed,
        subject: subject || existing.subject,
        topic: topic || existing.topic,
        dayOfWeek: dayOfWeek || existing.dayOfWeek,
        timeStart: timeStart || existing.timeStart,
        timeEnd: timeEnd || existing.timeEnd
      }
    });

    return NextResponse.json({ success: true, slot: updated });
  } catch (err: any) {
    console.error('Failed to update timetable slot:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETE /api/timetable — Delete a slot
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    const existing = await db.timetableSlot.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Slot not found or unauthorized' }, { status: 404 });
    }

    await db.timetableSlot.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Slot deleted successfully' });
  } catch (err: any) {
    console.error('Failed to delete timetable slot:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
