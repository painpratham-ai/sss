import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { question, correctAnswer, studentAnswer } = await req.json();
    if (!question || !correctAnswer || !studentAnswer) {
      return NextResponse.json({ error: 'Question, expected answer, and student answer are required.' }, { status: 400 });
    }

    const systemPrompt = `You are an expert examiner grading a student's oral answer to an active recall flashcard.
Question: ${question}
Expected Answer: ${correctAnswer}

Evaluate the student's answer and rate the recall quality on a scale of 0 to 5:
- 5: perfect response, covers all key points and formulas clearly.
- 4: correct response, with minor omissions or slight hesitation.
- 3: correct response but difficult to recall, or missing minor definitions.
- 2: incorrect response, but remembered the core concepts.
- 1: very poor response, only recalled random words.
- 0: complete blackout / no response.

Format your response strictly as a JSON object:
{
  "rating": number, // 0 to 5
  "feedback": "a short encouraging sentence explaining what was correct or missing"
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object.`;

    const aiResponse = await callModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Student's recall attempt:\n${studentAnswer}` }
      ],
      temperature: 0.3,
      question: `Evaluate flashcard recall answer: ${question}`,
      preferredModel: 'auto'
    });

    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse evaluation JSON from AI response. Response: " + aiResponse.content);
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Flashcard evaluation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
