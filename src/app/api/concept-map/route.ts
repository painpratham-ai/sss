import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { topic, board } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
    }

    const systemPrompt = `You are an expert Class 10 academic coordinator for the ${board || 'ICSE'} curriculum.
Your task is to break down the given study topic into a structured concept mind-map.
Create a central root node representing the main topic, and 4-6 connected sub-nodes representing key definitions, subtopics, formulas, or experiments.

For each node, provide:
1. id: a short unique string key (e.g. "root", "sub1", "sub2")
2. label: a short concise title (3-5 words max)
3. desc: a detailed 1-2 sentence RAG-grounded academic explanation of this concept suited for board exams.

For each edge, provide:
1. from: node id
2. to: node id
3. label: brief connection relationship (1-3 words max)

Format your response strictly as a JSON object:
{
  "nodes": [
    { "id": "root", "label": "Main Topic", "desc": "Main description" },
    { "id": "sub1", "label": "Subtopic A", "desc": "Explanation of subtopic A" }
  ],
  "edges": [
    { "from": "root", "to": "sub1", "label": "comprises" }
  ]
}
Do not include markdown tags like \`\`\`json or any text outside the JSON object. Ensure all properties are double-quoted valid JSON.`;

    const response = await callModel({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a concept mind-map for the topic: "${topic}"` }
      ],
      temperature: 0.3,
      question: `Generate academic concept mind-map for ${topic}`,
      preferredModel: 'auto'
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON mind-map from AI response: " + response.content);
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Concept map generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
