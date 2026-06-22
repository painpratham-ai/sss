import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { subject, question, answer, board } = await req.json();
    if (!subject || !question || !answer) {
      return NextResponse.json({ error: 'Subject, question, and student answer are required.' }, { status: 400 });
    }

    const systemPrompt = `You are a strict Board Examiner for ${board} Class 10 ${subject}.
Evaluate the student's answer based on the official specimen marking schemes and textbook standards.
Your job is to:
1. Grade the answer out of 5 marks.
2. Provide a list of key criteria met or unmet (with reasons).
3. Give detailed actionable feedback in markdown indicating exactly what was missing to get a perfect 5/5 score.

Format your response strictly as a JSON object:
{
  "marks": number, // out of 5
  "maxMarks": 5,
  "criteria": ["criterion 1: met/unmet explanation", "criterion 2: ..."],
  "feedback": "markdown formatted detailed critique highlighting strengths, weaknesses, and what is needed for a perfect 5/5 score"
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object.`;

    const aiResponse = await callModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${question}\n\nStudent Answer: ${answer}` }
      ],
      temperature: 0.3,
      question: `Evaluate specimen board answer for ${subject}: ${question}`,
      preferredModel: 'auto'
    });

    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse evaluation JSON from AI response: " + aiResponse.content);
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Answer evaluation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
