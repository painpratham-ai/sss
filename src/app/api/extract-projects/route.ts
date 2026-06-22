// POST /api/extract-projects — Detects and extracts multiple projects from a single PDF's text
import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { extractedText, board } = body as { extractedText: string; board?: string };

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({
        projects: [{
          index: 0,
          title: 'Uploaded Document',
          subject: '',
          className: '10',
          topic: '',
          extractedText: extractedText || '',
          selected: true,
        }]
      });
    }

    const activeBoard = board || 'ICSE';

    const systemPrompt = `You are a PROJECT EXTRACTOR AGENT. Your task is to analyze the given document text and determine if it contains MULTIPLE distinct school projects/topics.

Look for these indicators of multiple projects:
- Headings like "Project 1:", "Project 2:", "Topic A:", "Topic B:"
- Clear topic/subject changes (e.g., from Physics to Chemistry)
- Separate title pages or sections for different assignments
- Different project titles or aims within the same document
- Numbered or lettered project divisions

For EACH distinct project found, extract:
1. title: A descriptive title for the project
2. subject: The academic subject (Physics, Chemistry, Biology, History, etc.)
3. className: The class/grade level (default "10" if unclear)
4. topic: The main topic of the project
5. startText: The first 50 characters of this project's text (for identification)

IMPORTANT RULES:
- If the document contains ONLY ONE project/topic, return a single-item array
- If you're not sure whether something is a separate project, err on the side of keeping it as one project
- Do NOT split a single project into artificial sub-topics

Respond ONLY with valid JSON (no markdown fences):
{
  "multipleProjectsDetected": true/false,
  "count": <number>,
  "projects": [
    {
      "index": 0,
      "title": "...",
      "subject": "...",
      "className": "10",
      "topic": "...",
      "startText": "..."
    }
  ]
}`;

    const userPrompt = `Board: ${activeBoard}
Document text to analyze (first 8000 chars):
${extractedText.slice(0, 8000)}

${extractedText.length > 8000 ? `\n...and ${extractedText.length - 8000} more characters (document continues)` : ''}

Analyze the document and extract distinct projects:`;

    try {
      const result = await callModel({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        question: `Detect multiple projects in document for ${activeBoard} board`,
        preferredModel: 'auto'
      });

      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const projects = (parsed.projects || []).map((p: any, i: number) => {
          // Attempt to split extractedText for each project using startText markers
          let projectText = extractedText;
          if (parsed.multipleProjectsDetected && parsed.projects.length > 1) {
            // Try to split the text based on the detected project boundaries
            const nextProject = parsed.projects[i + 1];
            const currentStart = extractedText.indexOf(p.startText || '');
            const nextStart = nextProject
              ? extractedText.indexOf(nextProject.startText || '', currentStart + 50)
              : -1;

            if (currentStart >= 0 && nextStart > currentStart) {
              projectText = extractedText.slice(currentStart, nextStart).trim();
            } else if (currentStart >= 0) {
              projectText = extractedText.slice(currentStart).trim();
            } else if (i === 0) {
              // First project, take from beginning
              projectText = nextStart > 0
                ? extractedText.slice(0, nextStart).trim()
                : extractedText;
            }
          }

          return {
            index: i,
            title: p.title || `Project ${i + 1}`,
            subject: p.subject || '',
            className: p.className || '10',
            topic: p.topic || p.title || '',
            extractedText: projectText,
            selected: true,
          };
        });

        return NextResponse.json({
          multipleProjectsDetected: parsed.multipleProjectsDetected || false,
          count: projects.length,
          projects
        });
      }
    } catch (err: any) {
      console.error('[ExtractProjects] AI extraction failed:', err.message);
    }

    // Fallback: treat as single project
    return NextResponse.json({
      multipleProjectsDetected: false,
      count: 1,
      projects: [{
        index: 0,
        title: 'Uploaded Document',
        subject: '',
        className: '10',
        topic: '',
        extractedText,
        selected: true,
      }]
    });
  } catch (err: any) {
    console.error('Extract projects error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
