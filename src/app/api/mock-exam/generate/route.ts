import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retrieve } from '@/lib/knowledge';

export async function POST(request: Request) {
  try {
    const { board, className, subject, topics, marks = 40 } = await request.json();

    if (!board || !className || !subject) {
      return NextResponse.json(
        { error: 'Missing required parameters: board, className, subject' },
        { status: 400 }
      );
    }

    // 1. Fetch chunks from the KnowledgeBase that look like past questions or competency questions
    let query = `mock exam questions ${board} class ${className} ${subject}`;
    if (topics && topics.length > 0) {
      query += ` ${topics.join(' ')}`;
    }

    // We retrieve a larger pool of chunks so we can assemble a paper
    const chunks = await retrieve(query, { board, subject, topK: 15 });
    
    // Fallback if no questions are found via standard retrieval
    if (!chunks || chunks.length === 0) {
      // Direct DB query fallback
      const fallbackChunks = await db.knowledgeChunk.findMany({
        where: {
          board: board,
          subject: subject,
          className: String(className)
        },
        take: 10
      });
      chunks.push(...fallbackChunks.map(c => ({
        id: c.id,
        content: c.content,
        title: c.title,
        category: c.category,
        chapter: c.chapter,
        className: String(c.className),
        board: String(c.board),
        subject: String(c.subject),
        tags: '',
        score: 1.0
      })));
    }

    if (chunks.length === 0) {
       return NextResponse.json({ paper: null, message: "Not enough data to generate exam." });
    }

    // 2. We use AI (via our existing openclaw models) to synthesize the chunks into a realistic paper
    // To keep it fast for now, we'll format the raw chunks into sections
    
    // Shuffle chunks
    const shuffled = chunks.sort(() => 0.5 - Math.random());
    
    const paper = {
      title: `${board} Class ${className} - ${subject} Mock Exam`,
      totalMarks: marks,
      duration: marks === 80 ? '2 Hours' : '1 Hour',
      sections: [
        {
          name: 'Section A (Compulsory)',
          instructions: 'Attempt all questions from this section.',
          questions: shuffled.slice(0, Math.ceil(shuffled.length / 2)).map((c, i) => ({
            id: `q_A_${i+1}`,
            text: c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''), // Basic extraction
            marks: Math.floor(Math.random() * 3) + 2, // Random 2-4 marks for demo
            source: c.title
          }))
        },
        {
          name: 'Section B',
          instructions: 'Attempt any 3 questions from this section.',
          questions: shuffled.slice(Math.ceil(shuffled.length / 2)).map((c, i) => ({
             id: `q_B_${i+1}`,
             text: c.content.substring(0, 600) + (c.content.length > 600 ? '...' : ''),
             marks: Math.floor(Math.random() * 5) + 5, // Random 5-9 marks for demo
             source: c.title
          }))
        }
      ]
    };

    return NextResponse.json({ success: true, paper });
  } catch (error: any) {
    console.error('Error generating mock exam:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
