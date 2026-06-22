// POST /api/knowledge/add — add user-contributed knowledge chunk
import { NextRequest, NextResponse } from 'next/server';
import { addKnowledge } from '@/lib/knowledge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, className, category, chapter, title, content, tags, board } = body;

    if (!subject || !category || !title || !content) {
      return NextResponse.json({ error: 'subject, category, title, content required' }, { status: 400 });
    }

    await addKnowledge({
      board: board || 'ICSE',
      subject,
      className: className || '10',
      category,
      chapter: chapter || 'General',
      title,
      content,
      tags: tags || '',
      source: 'user_upload'
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
