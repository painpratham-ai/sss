import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';
import { retrieve } from '@/lib/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, className = '10', board = 'ICSE' } = body as {
      subject: string;
      topic: string;
      className?: string;
      board?: string;
    };

    if (!subject || !topic) {
      return NextResponse.json({ error: 'Subject and topic are required' }, { status: 400 });
    }

    // 1. Retrieve RAG grounded context for the topic
    let groundingContext = '';
    try {
      const retrieved = await retrieve(topic, { subject, topK: 4, board });
      if (retrieved.length > 0) {
        groundingContext = retrieved
          .map((c, i) => `[Context ${i + 1}] Title: ${c.title}\nChapter: ${c.chapter}\nContent:\n${c.content}`)
          .join('\n\n---\n\n');
      }
    } catch (err) {
      console.warn('Failed to retrieve RAG grounding context for flashcards:', err);
    }

    // 2. Build system and user prompt
    const systemPrompt = `You are an expert ${board} Class ${className} curriculum tutor.
Your task is to generate a set of exactly 6 to 8 active recall study flashcards on the requested topic.
Each flashcard must contain a "question" (a retrieval cue, query, or challenge) and a corresponding "answer" (containing precise, board-accepted definitions, formulas, or short explanations).

CRITICAL INSTRUCTIONS:
- Ensure the questions and answers strictly align with ${board} board standards.
- Keep the answers concise (under 40 words) but conceptual and accurate.
- Use key scientific terms and official board definitions.
- For math or physics topics, include key equations or constant values.
- Output ONLY a valid JSON array matching the schema below. No markdown backticks (like \`\`\`json), no prose.

JSON Schema:
[
  {
    "question": "Question text here...",
    "answer": "Answer text here..."
  }
]`;

    const userPrompt = `Topic: "${topic}"
Subject: "${subject}"
Board: ${board} Class ${className}

${groundingContext ? `Use the following RAG database context as your primary source of truth:\n\n${groundingContext}` : 'Use general syllabus criteria for your response.'}`;

    // 3. Call multi-model router
    const response = await callModel({
      question: `Generate flashcards for ${topic}`,
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      preferredModel: 'auto'
    });

    let content = response.content.trim();
    // Clean potential markdown blocks if LLM failed to follow the rule
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    // Validate JSON structure
    try {
      const flashcards = JSON.parse(content);
      if (!Array.isArray(flashcards)) {
        throw new Error('LLM output is not an array');
      }
      return NextResponse.json({ success: true, flashcards });
    } catch (jsonErr) {
      console.error('Failed to parse flashcards JSON output:', content, jsonErr);
      return NextResponse.json({
        error: 'Generated output was not in the correct JSON format. Please try again.',
        raw: content
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Flashcards API error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
