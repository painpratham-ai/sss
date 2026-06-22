import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';
import { retrieve } from '@/lib/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, className = '10', board = 'ICSE', blurtText } = body as {
      subject: string;
      topic: string;
      className?: string;
      board?: string;
      blurtText: string;
    };

    if (!subject || !topic || !blurtText || blurtText.trim().length < 5) {
      return NextResponse.json({ error: 'Subject, topic, and a valid recall text are required.' }, { status: 400 });
    }

    // 1. Retrieve RAG grounded reference details
    let groundingContext = '';
    try {
      const retrieved = await retrieve(topic, { subject, topK: 4, board });
      if (retrieved.length > 0) {
        groundingContext = retrieved
          .map((c, i) => `[Syllabus Reference ${i + 1}] Title: ${c.title}\nChapter: ${c.chapter}\nContent:\n${c.content}`)
          .join('\n\n---\n\n');
      }
    } catch (err) {
      console.warn('Failed to retrieve RAG grounding context for blurting analysis:', err);
    }

    // 2. Build system and user prompt
    const systemPrompt = `You are a strict and helpful ${board} board examiner grading a student's active recall "blurting" exercise.
The student has selected a topic and written down everything they remember about it (or explained it in simple terms, using the Feynman Technique).
Your job is to critically evaluate their explanation against the official syllabus expectations and output a structured JSON report.

JSON Response Schema:
{
  "score": 85, // Integer from 0 to 100 representing accuracy and coverage
  "misconceptions": [
    "Identify any incorrect facts, formula errors, or wrong definitions written by the student. Be precise."
  ],
  "missingPoints": [
    "List key words, constants, physical conditions, properties, or definitions required by the syllabus that the student forgot to mention."
  ],
  "remedyTip": "An encouraging but constructive paragraph explaining how they can patch these specific gaps (e.g. key terms to memorize, simple analogies)."
}

CRITICAL INSTRUCTIONS:
- Ground your assessment in the syllabus reference context if provided.
- If the student's text is very brief or unrelated, give a low score and list missing points.
- If they got formulas slightly wrong (e.g. V = I/R instead of V = IR), highlight it under misconceptions.
- Output ONLY the raw JSON object. Do not wrap in markdown \`\`\`json blocks.`;

    const userPrompt = `Topic: "${topic}"
Subject: "${subject}"
Board: ${board} Class ${className}

Student's Recall Text:
"""
${blurtText}
"""

${groundingContext ? `Official Syllabus & Exam References:\n\n${groundingContext}` : 'Evaluate against general board criteria.'}`;

    // 3. Call multi-model router
    const response = await callModel({
      question: `Evaluate free recall for ${topic}`,
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      preferredModel: 'auto'
    });

    let content = response.content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    try {
      const report = JSON.parse(content);
      return NextResponse.json({ success: true, report });
    } catch (jsonErr) {
      console.error('Failed to parse blurting report JSON:', content, jsonErr);
      return NextResponse.json({
        error: 'Evaluation was completed but the response was formatted incorrectly. Please try again.',
        raw: content
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Blurt API error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
