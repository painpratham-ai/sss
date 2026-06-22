// POST /api/quiz — generate 5 MCQs for Quiz Clash multiplayer arena
import { NextRequest, NextResponse } from 'next/server';
import { runQuizAgent } from '@/lib/agents';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, className, topic, board } = body as {
      subject: string; className: string; topic: string; board?: string;
    };

    if (!subject || !topic) {
      return NextResponse.json({ error: 'Subject and topic are required' }, { status: 400 });
    }

    const { quiz, log } = await runQuizAgent(subject, className || '10', topic, board);

    return NextResponse.json({ quiz, log });
  } catch (err: any) {
    console.error('Quiz gen error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
