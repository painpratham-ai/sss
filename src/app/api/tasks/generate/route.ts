import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow sufficient duration for LLM routing and response

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { prompt, date } = body as { prompt: string; date: string };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt/Transcription is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Target date (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const systemPrompt = `You are the Student Study Planner Task Extractor.
The student has provided a raw voice transcription or text description describing the tasks they want to do for the date ${date}.
Your job is to analyze the input and extract a clean list of structured study/daily tasks.

Guidelines:
1. Break down the activities into discrete, actionable task descriptions.
2. Formulate clear, concise titles for each checklist item.
3. Incorporate the subject and specific topic if mentioned (e.g. write "Review Biology mitosis diagrams" instead of just "Mitosis" or "Biology").
4. Fix transcription errors or typos gracefully so the resulting tasks look clean.
5. If the input is empty or has no identifiable study items, generate a fallback "Study and review session".

Respond ONLY with a valid JSON array of objects, containing no markdown formatting:
[
  { "title": "Checklist task description 1" },
  { "title": "Checklist task description 2" }
]`;

    const result = await callModel({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Analyze this daily study description for ${date}: "${prompt}"` }
      ],
      temperature: 0.2,
      question: 'Extract daily checklist tasks from raw voice description',
      preferredModel: 'auto'
    });

    let tasksToCreate: { title: string }[] = [];
    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasksToCreate = JSON.parse(jsonMatch[0]);
      } else {
        tasksToCreate = JSON.parse(result.content);
      }
    } catch (e) {
      console.warn('Failed to parse AI response as JSON array, using plain text extraction:', result.content);
      // Fallback: split by lines or bullet points
      const lines = result.content
        .split('\n')
        .map(l => l.replace(/^[-*+\d.\s]+/g, '').trim())
        .filter(l => l.length > 3);
      tasksToCreate = lines.map(title => ({ title }));
    }

    // Default fallback if empty
    if (!Array.isArray(tasksToCreate) || tasksToCreate.length === 0) {
      tasksToCreate = [{ title: 'Revision & self-study session' }];
    }

    const createdTasks: any[] = [];
    for (const t of tasksToCreate) {
      if (t.title) {
        const task = await db.task.create({
          data: {
            userId,
            date,
            title: t.title,
            completed: false
          }
        });
        createdTasks.push(task);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully extracted and created ${createdTasks.length} tasks!`,
      tasks: createdTasks
    });
  } catch (err: any) {
    console.error('Failed to generate tasks using AI:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
