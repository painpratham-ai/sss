import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_SLOTS = [
  { subject: 'Physics', topic: 'Electromagnetism & Ohm\'s Law review', dayOfWeek: 'Monday', timeStart: '10:00', timeEnd: '12:00' },
  { subject: 'Chemistry', topic: 'Electrolysis and Periodic Properties study', dayOfWeek: 'Wednesday', timeStart: '14:00', timeEnd: '16:00' },
  { subject: 'Mathematics', topic: 'Quadratic Equations & Circle theorems', dayOfWeek: 'Friday', timeStart: '16:00', timeEnd: '18:00' }
];

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { prompt } = body as { prompt: string };

    if (!prompt || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt is required and must be longer' }, { status: 400 });
    }

    let parsedSlots = DEFAULT_SLOTS;
    let aiParsed = false;

    try {
      const systemPrompt = `You are the ICSE Study Planner AI.
Analyze the student's schedule request (which could be typed or voice-transcribed) and generate a list of structured study slots.
Convert subjects to standard ICSE board topics: [Physics, Chemistry, Biology, Mathematics, English, History, Geography, Computer].
Keep study blocks realistic (usually 1-2 hours per session).
Assign dayOfWeek: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday].
Time format: 24h HH:MM (e.g. "09:00", "15:30").

Respond ONLY with a valid JSON array of objects, with no markdown fences, no extra prose:
[
  {
    "subject": "Physics" | "Chemistry" | "Biology" | "Mathematics" | "English" | "History" | "Geography" | "Computer",
    "topic": "Syllabus chapter or task description",
    "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
    "timeStart": "HH:MM",
    "timeEnd": "HH:MM"
  }
]`;

      const aiResponse = await callModel({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: `Create my study planner based on this request:\n"${prompt}"` }
        ],
        temperature: 0.5,
        question: `Generate timetable slots: ${prompt.slice(0, 100)}`,
        preferredModel: 'auto'
      });

      let rawText = aiResponse.content || '';
      rawText = rawText.replace(/```json/i, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedSlots = parsed.map(s => ({
          subject: s.subject || 'Physics',
          topic: s.topic || 'General Revision',
          dayOfWeek: s.dayOfWeek || 'Monday',
          timeStart: s.timeStart || '09:00',
          timeEnd: s.timeEnd || '10:00'
        }));
        aiParsed = true;
      }
    } catch (aiErr) {
      console.warn('AI Timetable generation failed, using keyword heuristics fallback:', aiErr);
      
      // Keyword heuristics fallback
      const text = prompt.toLowerCase();
      const matchSubject = () => {
        if (text.includes('physics')) return 'Physics';
        if (text.includes('chemistry') || text.includes('chem')) return 'Chemistry';
        if (text.includes('biology') || text.includes('bio')) return 'Biology';
        if (text.includes('math') || text.includes('algebra')) return 'Mathematics';
        if (text.includes('english')) return 'English';
        if (text.includes('history')) return 'History';
        if (text.includes('geography')) return 'Geography';
        if (text.includes('computer') || text.includes('java')) return 'Computer';
        return 'Physics';
      };

      const matchDay = () => {
        if (text.includes('monday') || text.includes('mon')) return 'Monday';
        if (text.includes('tuesday') || text.includes('tue')) return 'Tuesday';
        if (text.includes('wednesday') || text.includes('wed')) return 'Wednesday';
        if (text.includes('thursday') || text.includes('thu')) return 'Thursday';
        if (text.includes('friday') || text.includes('fri')) return 'Friday';
        if (text.includes('saturday') || text.includes('sat')) return 'Saturday';
        if (text.includes('sunday') || text.includes('sun')) return 'Sunday';
        return 'Monday';
      };

      parsedSlots = [
        {
          subject: matchSubject(),
          topic: prompt.length > 50 ? prompt.slice(0, 47) + '...' : prompt,
          dayOfWeek: matchDay(),
          timeStart: '10:00',
          timeEnd: '12:00'
        }
      ];
    }

    // Persist all generated slots directly to the database
    const savedSlots: any[] = [];
    for (const slot of parsedSlots) {
      const saved = await db.timetableSlot.create({
        data: {
          userId,
          subject: slot.subject,
          topic: slot.topic,
          dayOfWeek: slot.dayOfWeek,
          timeStart: slot.timeStart,
          timeEnd: slot.timeEnd,
          completed: false
        }
      });
      savedSlots.push(saved);
    }

    return NextResponse.json({
      success: true,
      aiGenerated: aiParsed,
      slots: savedSlots,
      message: aiParsed
        ? `Successfully generated ${savedSlots.length} AI study slots!`
        : `Heuristics schedule generated: ${savedSlots.length} study block added.`
    });
  } catch (err: any) {
    console.error('Failed to generate timetable slots:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
