import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, originalExplanation, question, solutionSteps, studentAttempt } = body as {
      action: 'generate' | 'verify';
      originalExplanation?: string;
      question?: string;
      solutionSteps?: string;
      studentAttempt?: string;
    };

    if (action === 'generate') {
      if (!originalExplanation) {
        return NextResponse.json({ error: 'Original explanation is required for generation' }, { status: 400 });
      }

      const systemPrompt = `You are a math and physics numerical tutor.
Analyze this tutor explanation containing a calculation or problem:
"${originalExplanation}"

Extract the numerical problem. Generate a new similar practice question by altering the input numbers (e.g., if it uses 20V, change it to 50V; if it uses 5kg, change it to 8kg) while preserving the formula structure and concept.
Provide the new question and the step-by-step correct solution.

Format your response strictly as a JSON object:
{
  "question": "The new question statement",
  "solutionSteps": "The step-by-step correct solution steps and final value"
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object.`;

      const aiResponse = await callModel({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate similar practice question.' }
        ],
        temperature: 0.4,
        question: 'Generate change variables practice numerical',
        preferredModel: 'auto'
      });

      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse generation JSON: " + aiResponse.content);
      }

      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);

    } else if (action === 'verify') {
      if (!question || !solutionSteps || !studentAttempt) {
        return NextResponse.json({ error: 'Question, solution steps, and student attempt are required for verification' }, { status: 400 });
      }

      const systemPrompt = `You are a math and physics examiner.
A student solved this practice question:
"${question}"

The correct solution steps are:
"${solutionSteps}"

Here is the student's step-by-step attempt:
"${studentAttempt}"

Evaluate the student's formula application, calculation steps, and final value. Point out any errors.
Format your response strictly as a JSON object:
{
  "correct": boolean,
  "feedback": "markdown formatted friendly critique of their attempt, detailing correct steps and any errors"
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object.`;

      const aiResponse = await callModel({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Verify student attempt.' }
        ],
        temperature: 0.3,
        question: 'Verify student change variables attempt',
        preferredModel: 'auto'
      });

      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse verification JSON: " + aiResponse.content);
      }

      const result = JSON.parse(jsonMatch[0]);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Practice solver error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
