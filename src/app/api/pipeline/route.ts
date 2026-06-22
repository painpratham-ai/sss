// POST /api/pipeline — runs the full multi-agent pipeline on extracted PDF text
import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceText, sourceName, userTopic, userSubject, userClass, board, skipImages } = body as {
      sourceText?: string; sourceName?: string;
      userTopic?: string; userSubject?: string; userClass?: string;
      board?: string; skipImages?: boolean;
    };

    if (!sourceText || sourceText.trim().length < 20) {
      return NextResponse.json({ error: 'Source text too short — upload a PDF with extractable content.' }, { status: 400 });
    }

    // Create a pending project
    const project = await db.project.create({
      data: {
        title: userTopic || sourceName || 'Untitled Project',
        subject: userSubject || 'General',
        className: userClass || '10',
        topic: userTopic || 'Untitled',
        board: board || 'ICSE',
        status: 'processing',
        sourceText,
        sourceName: sourceName || 'upload'
      }
    });

    // Run pipeline (skipImages prevents OOM crashes on memory-constrained servers)
    const result = await runPipeline({
      sourceText,
      sourceName: sourceName || 'upload',
      userTopic, userSubject, userClass,
      board,
      skipImages: skipImages ?? false,
      webSearch: true // Enable web grounding by default for richer factual content
    });

    // Save results
    await db.project.update({
      where: { id: project.id },
      data: {
        title: result.topic,
        subject: result.subject,
        className: result.className,
        topic: result.topic,
        board: board || 'ICSE',
        status: 'completed',
        outline: JSON.stringify(result.outline),
        finalOutput: result.finalOutput,
        images: JSON.stringify(result.images),
        agentLogs: JSON.stringify(result.logs)
      }
    });

    return NextResponse.json({
      projectId: project.id,
      subject: result.subject,
      className: result.className,
      topic: result.topic,
      board: board || 'ICSE',
      outline: result.outline,
      finalOutput: result.finalOutput,
      images: result.images,
      logs: result.logs
    });
  } catch (err: any) {
    console.error('Pipeline error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
