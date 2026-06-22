import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, subject, board, guidelines } = await req.json();
    if (!text || !subject || !guidelines) {
      return NextResponse.json({ error: 'Text, subject, and guidelines are required.' }, { status: 400 });
    }

    const systemPrompt = `You are an expert board examiner for ${board} Class 10 ${subject}.
Analyze the student's study material/notes and compare it with the following official syllabus guidelines:
${JSON.stringify(guidelines)}

Your job is to:
1. Identify which guidelines are fully/partially covered, and which are completely missing.
2. Calculate a syllabus alignment score (0 to 100) reflecting how well their notes cover the mandatory topics.
3. Write a brief actionable critique highlighting missing topics.

Format the response strictly as a JSON object:
{
  "score": number, // 0 to 100
  "coveredIds": string[], // matching IDs from guidelines
  "missingIds": string[], // missing IDs from guidelines
  "critique": "markdown formatted feedback pointing out missing elements and recommendations"
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object.`;

    const aiResponse = await callModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the student's material to analyze:\n\n${text}` }
      ],
      temperature: 0.2,
      question: `Evaluate syllabus alignment checker for ${subject}`,
      preferredModel: 'auto'
    });

    const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse analysis JSON from AI model response. Response was: " + aiResponse.content);
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Syllabus alignment check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
