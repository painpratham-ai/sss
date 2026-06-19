// POST /api/chat — ICSE tutor chatbot with RAG + reasoning (GLM-4.6 or OpenClaw)
// Body: { message: string, sessionId?: string, subject?: string, forceReasoning?: boolean }
// Returns: { sessionId, answer, reasoning?, sources, cached, durationMs, backend }

import { NextRequest, NextResponse } from 'next/server';
import {
  chatWithTutor,
  createSession,
  addToSession,
  getSession,
  type ChatMessage
} from '@/lib/chat';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, subject, forceReasoning, forceWebSearch, preferredModel } = body as {
      message?: string;
      sessionId?: string;
      subject?: string;
      forceReasoning?: boolean;
      forceWebSearch?: boolean;
      preferredModel?: 'auto' | 'glm' | 'openai' | 'deepseek' | 'grok';
    };

    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let sid = sessionId;
    if (!sid || !getSession(sid)) {
      sid = createSession();
    }

    const session = getSession(sid)!;
    const history: ChatMessage[] = session.messages.map(m => ({ role: m.role, content: m.content }));

    addToSession(sid, { role: 'user', content: message });

    const response = await chatWithTutor(message, history, { subject, forceReasoning, forceWebSearch, preferredModel });

    addToSession(sid, {
      role: 'assistant',
      content: response.answer,
      reasoning: response.reasoning,
      sources: response.sources,
      cached: response.cached,
      durationMs: response.durationMs,
      backend: response.backend
    });

    return NextResponse.json({
      sessionId: sid,
      answer: response.answer,
      reasoning: response.reasoning,
      sources: response.sources,
      cached: response.cached,
      durationMs: response.durationMs,
      backend: response.backend,
      webSearched: response.webSearched || false,
      model: response.model,
      modelUsed: response.modelUsed,
      fallbackUsed: response.fallbackUsed || false,
      fallbackReason: response.fallbackReason,
      attemptedModels: response.attemptedModels || []
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sessionId');
  if (!sid) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  const session = getSession(sid);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  });
}

export async function DELETE(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get('sessionId');
  if (!sid) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  const session = getSession(sid);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  session.messages = [];
  session.updatedAt = new Date();
  return NextResponse.json({ ok: true });
}
