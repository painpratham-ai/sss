import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const board = searchParams.get('board');
    const className = searchParams.get('className');
    const subject = searchParams.get('subject');

    // If query parameters are not fully provided, return the dynamic mapping of available options
    if (!board || !className || !subject) {
      const chunks = await db.knowledgeChunk.findMany({
        where: { category: 'syllabus' },
        select: { board: true, className: true, subject: true }
      });

      const boardsMap: Record<string, Record<string, string[]>> = {};

      for (const chunk of chunks) {
        const b = chunk.board;
        const c = chunk.className;
        const s = chunk.subject;

        if (!boardsMap[b]) {
          boardsMap[b] = {};
        }
        if (!boardsMap[b][c]) {
          boardsMap[b][c] = [];
        }
        if (!boardsMap[b][c].includes(s)) {
          boardsMap[b][c].push(s);
        }
      }

      // Sort subjects alphabetically for consistency
      for (const b of Object.keys(boardsMap)) {
        for (const c of Object.keys(boardsMap[b])) {
          boardsMap[b][c].sort();
        }
      }

      return NextResponse.json({ boardsMap });
    }

    // Query matched syllabus chunks
    const chunks = await db.knowledgeChunk.findMany({
      where: {
        category: 'syllabus',
        board,
        className,
        subject
      },
      orderBy: [
        { chapter: 'asc' },
        { title: 'asc' }
      ]
    });

    const syllabusItems = chunks.map(chunk => ({
      id: chunk.id,
      topic: chunk.chapter || chunk.subject,
      subtopic: chunk.title,
      guideline: chunk.content
    }));

    return NextResponse.json({ syllabusItems });
  } catch (err: any) {
    console.error('Failed to fetch syllabus data:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
