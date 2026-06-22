// POST /api/mock — generate ICSE specimen-style mock paper
import { NextRequest, NextResponse } from 'next/server';
import { runMockAgent } from '@/lib/agents';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, className, topic: originalTopic, difficulty, projectId, format, isPyq, year, board, targetWeaknesses, questionTypes } = body as {
      subject: string; className: string; topic: string;
      difficulty?: string; projectId?: string; format?: string;
      isPyq?: boolean; year?: number; board?: string;
      targetWeaknesses?: boolean;
      questionTypes?: string[];
    };

    if (!subject || !originalTopic) {
      return NextResponse.json({ error: 'Subject and topic are required' }, { status: 400 });
    }

    let topic = originalTopic;

    if (targetWeaknesses) {
      try {
        const user = await getUserFromSession();
        const userId = user?.id || 'guest';
        const profile = await db.studentProfile.findUnique({
          where: { userId }
        });
        if (profile?.weaknesses) {
          const allWeaknesses = JSON.parse(profile.weaknesses) as string[];
          const matching = allWeaknesses
            .filter(w => w.toLowerCase().includes(subject.toLowerCase()))
            .map(w => {
              const parts = w.split('-');
              return parts.length > 1 ? parts[1].trim() : w.trim();
            });
          if (matching.length > 0) {
            topic = `${originalTopic} (Heavily weighted with questions focusing on student's weak areas: ${matching.join(', ')})`;
          }
        }
      } catch (err) {
        console.warn('Failed to parse weaknesses for target mock paper:', err);
      }
    }

    const { paper, log } = await runMockAgent(
      subject, className || '10', topic, difficulty || 'medium', format || 'full', !!isPyq, year || 2024, board, questionTypes
    );

    const saved = await db.mock.create({
      data: {
        projectId: projectId || null,
        subject, className: className || '10', topic,
        board: board || 'ICSE',
        difficulty: isPyq ? `PYQ ${year}` : (difficulty || 'medium'),
        questions: JSON.stringify(paper),
        duration: paper.duration || 60
      }
    });

    return NextResponse.json({ id: saved.id, paper, log });
  } catch (err: any) {
    console.error('Mock gen error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
