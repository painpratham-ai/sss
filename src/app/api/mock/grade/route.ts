// POST /api/mock/grade — Grade student answers for mock test using ICSE Criteria
import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, answers, board } = body as {
      subject: string;
      topic: string;
      answers: {
        question: string;
        marks: number;
        expectedAnswer: string;
        studentAnswer: string;
      }[];
      board?: string;
    };

    if (!subject || !answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const activeBoard = board || 'ICSE';
    const systemPrompt = `You are the ${activeBoard} Board Exam Grader Agent.
Your job: grade a student's answers to a ${activeBoard} mock test on subject "${subject}" and topic "${topic}".
Compare each student's answer with the expected marking scheme answer.
Rate the student's answer out of the allocated marks.
Apply ${activeBoard} Board grading criteria:
- Exact definitions and key scientific terms must be present for full marks.
- Partial or vague explanations receive partial marks.
- Deduct marks if units are missing or incorrect in calculations.
Provide constructive feedback for each answer (1-2 sentences) explaining why marks were lost and what specific key words were missing.
Finally, give a general tutor summary with encouraging feedback in a helpful Indian-teacher tone.

Respond ONLY with valid JSON, no markdown blocks, no extra prose:
{
  "totalScore": 0,
  "maxMarks": 0,
  "feedback": "General tutor comments here...",
  "breakdown": [
    {
      "questionIndex": 0,
      "score": 0,
      "feedback": "Question feedback here..."
    }
  ]
}`;

    const userPrompt = `Grade the following answers:
${answers.map((a, i) => `
--- Question ${i + 1} ---
Question: ${a.question}
Allocated Marks: ${a.marks}
Expected Answer (Marking Scheme): ${a.expectedAnswer}
Student's Answer: ${a.studentAnswer || '(Not Answered)'}
`).join('\n')}`;

    const result = await callModel({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      question: `Grade this student test on ${subject}`,
      preferredModel: 'auto'
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsed) {
      throw new Error('Failed to parse grading response: ' + result.content);
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Mock grade error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
