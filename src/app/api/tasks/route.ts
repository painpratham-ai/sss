import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { detectSubject } from '@/lib/chat';

export const runtime = 'nodejs';

// 1. GET /api/tasks?date=YYYY-MM-DD — Fetch tasks for a specific date
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const date = req.nextUrl.searchParams.get('date');
    if (!date) {
      return NextResponse.json({ error: 'Date query parameter (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const tasks = await db.task.findMany({
      where: { userId, date },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('Failed to fetch tasks:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. POST /api/tasks — Add a manual task
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { date, title } = body as { date: string; title: string };

    if (!date || !title) {
      return NextResponse.json({ error: 'Date and Title are required' }, { status: 400 });
    }

    const task = await db.task.create({
      data: {
        userId,
        date,
        title,
        completed: false
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    console.error('Failed to create task:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. PUT /api/tasks — Toggle completion or reschedule (delay)
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { id, completed, date, delayedFrom, delayReason } = body as {
      id: string;
      completed?: boolean;
      date?: string;
      delayedFrom?: string;
      delayReason?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const existing = await db.task.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    const wasRescheduled = date && date !== existing.date;

    const updated = await db.task.update({
      where: { id },
      data: {
        completed: completed !== undefined ? completed : existing.completed,
        date: date || existing.date,
        delayedFrom: wasRescheduled ? (delayedFrom || existing.date) : existing.delayedFrom,
        delayReason: wasRescheduled ? (delayReason || '') : existing.delayReason
      }
    });

    // Logging Second Brain Study Events
    if (completed === true && !existing.completed) {
      try {
        await db.studyEvent.create({
          data: {
            userId,
            eventType: 'task_completed',
            subject: detectSubject(existing.title) || 'General',
            topic: existing.title,
            metadata: JSON.stringify({
              taskId: existing.id,
              title: existing.title,
              date: existing.date
            })
          }
        });
      } catch (evtErr) {
        console.error('Failed to log task_completed event:', evtErr);
      }
    }

    if (wasRescheduled) {
      try {
        await db.studyEvent.create({
          data: {
            userId,
            eventType: 'task_delayed',
            subject: detectSubject(existing.title) || 'General',
            topic: existing.title,
            metadata: JSON.stringify({
              taskId: existing.id,
              title: existing.title,
              from: existing.date,
              to: date,
              reason: delayReason || ''
            })
          }
        });
      } catch (evtErr) {
        console.error('Failed to log task_delayed event:', evtErr);
      }
    }

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error('Failed to update task:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. DELETE /api/tasks — Delete a task
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const existing = await db.task.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }

    await db.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (err: any) {
    console.error('Failed to delete task:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
