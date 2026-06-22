import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { callModel } from '@/lib/models';
import type { ModelId } from '@/lib/models';
import { runMockAgent } from '@/lib/agents';
import { retrieve } from '@/lib/knowledge';
import { detectSubject } from '@/lib/chat';

export const runtime = 'nodejs';
export const maxDuration = 120; // Allow enough time for mock test generation

async function executeAction(userId: string, action: any, board: string) {
  console.log('Executing partner action:', action);
  try {
    switch (action.type) {
      case 'set_schedule': {
        const slots = action.slots;
        if (!Array.isArray(slots)) throw new Error('Slots must be an array');
        const createdSlots: any[] = [];
        for (const slot of slots) {
          const created = await db.timetableSlot.create({
            data: {
              userId,
              subject: slot.subject || 'General',
              topic: slot.topic || 'Revision Session',
              dayOfWeek: slot.dayOfWeek || 'Monday',
              timeStart: slot.timeStart || '09:00',
              timeEnd: slot.timeEnd || '10:00',
              completed: false
            }
          });
          createdSlots.push(created);
        }
        return { success: true, data: { slots: createdSlots } };
      }

      case 'clear_schedule': {
        const { dayOfWeek, subject } = action;
        const whereClause: any = { userId };
        if (dayOfWeek) whereClause.dayOfWeek = dayOfWeek;
        if (subject) whereClause.subject = subject;

        await db.timetableSlot.deleteMany({
          where: whereClause
        });
        return { success: true, data: { cleared: true } };
      }

      case 'update_profile': {
        const { learningStyle, interests, strengths, weaknesses } = action;
        const currentProfile = await db.studentProfile.findUnique({
          where: { userId }
        });

        const dataToUpdate: any = {};
        if (learningStyle) dataToUpdate.learningStyle = learningStyle;
        if (interests) dataToUpdate.interests = JSON.stringify(interests);
        if (strengths) dataToUpdate.strengths = JSON.stringify(strengths);
        if (weaknesses) dataToUpdate.weaknesses = JSON.stringify(weaknesses);
        dataToUpdate.lastAIExtraction = new Date();

        const updated = await db.studentProfile.upsert({
          where: { userId },
          create: {
            userId,
            learningStyle: learningStyle || 'Direct',
            interests: JSON.stringify(interests || []),
            strengths: JSON.stringify(strengths || []),
            weaknesses: JSON.stringify(weaknesses || []),
            studyHabits: JSON.stringify({
              consistency: 60,
              testsTaken: 0,
              flashcardsReviewed: 0,
              simulationsCompleted: 0
            }),
            memoryLog: '[]',
            lastAIExtraction: new Date()
          },
          update: dataToUpdate
        });
        return { success: true, data: { profile: updated } };
      }

      case 'update_syllabus': {
        const { topicId, status, subject, topic } = action;
        const studyEvent = await db.studyEvent.create({
          data: {
            userId,
            eventType: 'syllabus_toggle',
            subject: subject || 'General',
            topic: topic || 'Syllabus Topic',
            metadata: JSON.stringify({
              topicId,
              action: status,
              completedAt: new Date()
            })
          }
        });
        return { success: true, data: { studyEvent, topicId, status } };
      }

      case 'generate_mock': {
        const { subject, topic, difficulty, format } = action;
        const className = '10';

        const { paper } = await runMockAgent(
          subject,
          className,
          topic,
          difficulty || 'medium',
          format || 'full',
          false,
          2024,
          board
        );

        const saved = await db.mock.create({
          data: {
            projectId: null,
            subject,
            className,
            topic,
            board,
            difficulty: difficulty || 'medium',
            questions: JSON.stringify(paper),
            duration: paper.duration || 60
          }
        });
        return { success: true, data: { mockId: saved.id, paper } };
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (err: any) {
    console.error('Error executing partner action:', err);
    return { success: false, error: err.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    const body = await req.json();
    const { message, history = [], preferredModel = 'auto', board } = body as {
      message: string;
      history: { role: string; content: string }[];
      preferredModel?: ModelId;
      board?: string;
    };

    if (!message || message.trim().length < 2) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const activeBoard = board || user?.board || 'ICSE';

    // 1. Fetch student's profile
    const profile = await db.studentProfile.findUnique({
      where: { userId }
    });

    const learningStyle = profile?.learningStyle || 'Direct';
    const interests = JSON.parse(profile?.interests || '[]');
    const strengths = JSON.parse(profile?.strengths || '[]');
    const weaknesses = JSON.parse(profile?.weaknesses || '[]');
    const memoryLog = JSON.parse(profile?.memoryLog || '[]');

    const studyHabits = JSON.parse(profile?.studyHabits || '{}');
    const targetScore = studyHabits.targetScore || 'Not specified';
    const painPoint = studyHabits.painPoint || 'Not specified';
    const tutorPersona = studyHabits.tutorPersona || 'Encouraging Indian Teacher';

    // 2. Retrieve relevant knowledge for RAG grounding from the board database
    const subject = detectSubject(message);
    const retrieved = await retrieve(message, {
      subject,
      topK: 5,
      board: activeBoard
    });
    const kbContext = retrieved.length > 0
      ? retrieved.map((c, i) =>
          `[${i + 1}] BOARD: ${c.board} | SUBJECT: ${c.subject} | CHAPTER: ${c.chapter} | CATEGORY: ${c.category}\nTITLE: ${c.title}\n${c.content.slice(0, 1500)}`
        ).join('\n\n---\n\n')
      : `(No specific ${activeBoard} board knowledge chunks matched.)`;

    // 3. Build system prompt based on Second Brain profile and KB Context
    const interestsStr = interests.length > 0 ? interests.join(', ') : 'general education';
    const strengthsStr = strengths.length > 0 ? strengths.join(', ') : 'no specific logs yet';
    const weaknessesStr = weaknesses.length > 0 ? weaknesses.join(', ') : 'no specific logs yet';
    const memoryLogStr = memoryLog.length > 0 ? memoryLog.map((f: string) => `- ${f}`).join('\n') : 'none';

    let pedagogicalInstruction = '';
    if (learningStyle === 'Socratic') {
      pedagogicalInstruction = `Use the Socratic method of instruction. Do not answer questions directly. Instead, ask leading questions to guide the student's critical thinking and let them discover the answer themselves.`;
    } else if (learningStyle === 'Analogy') {
      pedagogicalInstruction = `Use rich, colorful analogies and metaphors in every explanation. Build analogies based on the student's personal interests (${interestsStr}) whenever possible to make complex topics intuitive.`;
    } else if (learningStyle === 'Practical') {
      pedagogicalInstruction = `Emphasize practical applications, laboratory procedures, real-world examples, and hands-on experiments. Reference scientific apparatus, measurements, and visual changes.`;
    } else if (learningStyle === 'Visual') {
      pedagogicalInstruction = `Use vivid, step-by-step descriptions that evoke mental diagrams, charts, ray diagrams, or flowcharts. Structure your output with clear bullet points and visual spacing.`;
    } else {
      pedagogicalInstruction = `Explain concepts directly, clearly, and concisely, highlighting key scientific definitions and formulas.`;
    }

    let personaPrompt = '';
    if (tutorPersona.includes('Strict')) {
      personaPrompt = `Your persona/tone is: Strict Board Exam Inspector. Speak in a firm, rigorous, detail-oriented, and highly exam-focused tone. Do not tolerate sloppiness. Demand correct key phrases, point out where marks will be cut, and push the student to write precise answers matching CISCE/CBSE scoring rubrics. Use motivating but challenging Indian teacher phrases like "Pay attention!", "This is a typical board trap!", "Focus!"`;
    } else if (tutorPersona.includes('Scientist')) {
      personaPrompt = `Your persona/tone is: Analytical Research Scientist. Speak in an intellectual, in-depth, curious, and highly detailed academic tone. Relate science concepts to advanced research, explain the deeper 'why' and historical context behind formulas, and encourage deep critical thinking. Use phrases like "Fascinating query!", "Let us analyze the raw data...", "From a theoretical physics standpoint..."`;
    } else if (tutorPersona.includes('Buddy')) {
      personaPrompt = `Your persona/tone is: Peer Study Buddy. Speak in a highly conversational, casual, friendly, and supportive student-to-student tone. Use informal slang (like "bro", "let's do this", "easy peasy"), keep explanations visual and simple, share study hacks, and act like a classmate studying together for the exams.`;
    } else {
      personaPrompt = `Your persona/tone is: Encouraging Indian Teacher. Speak in a warm, friendly, motivating, and patient tone. Emphasize progression, cheer them on, and use gentle supportive phrases like "Excellent effort!", "Let's crack this together, beta!", "Very good, carry on!"`;
    }

    const systemPrompt = `You are the Student's AI Second Brain Study Partner for the ${activeBoard} Board exam-prep.
Your goal is to act as a supportive, highly intelligent study companion and personal tutor.

INTERACTIVE QUIZ GENERATION RULE:
If the student asks you for a quiz, test, mock, or practice questions on any topic, you MUST generate and embed an interactive quiz in your response using a markdown code block starting with \`\`\`interactive-quiz and ending with \`\`\`.
Inside this code block, output ONLY a single valid JSON object following this schema:
{
  "title": "Quiz Title",
  "questions": [
    {
      "q": "Question description...",
      "type": "mcq", // or "fill_in_the_blank" or "short"
      "marks": 1,
      "options": ["Option A", "Option B", "Option C", "Option D"], // only for mcq
      "answerIndex": 0, // only for mcq, 0-3 index
      "answer": "Expected correct answer string", // for fill_in_the_blank or short
      "explanation": "Simple brief explanation of the correct answer"
    }
  ]
}
Generate 3 to 5 questions. Make it highly engaging. Do not include markdown formatting or prose inside the \`\`\`interactive-quiz code block. You can write encouraging text before or after the code block in your normal partner/buddy persona.

${personaPrompt}

Here is what you know about the student (strictly respect and adapt to this profile):
- **Primary Learning Style**: ${learningStyle}
- **Personal Interests**: ${interestsStr} (Use these to tailor analogies or examples, e.g. cricket, gaming)
- **Academic Target Goal**: ${targetScore} (Align all advice and examples to help them hit this target)
- **Primary Study Challenge**: ${painPoint} (Offer specialized study hacks, check for understanding, and provide extra review on these challenges)
- **Strengths (Mastered Topics)**: ${strengthsStr} (Reinforce and build on these)
- **Weaknesses (Needs Focus)**: ${weaknessesStr} (Offer extra explanations, encourage them to review, and check understanding)
- **Memory Vault (Key facts they struggled with)**:
${memoryLogStr}

Pedagogical directive:
${pedagogicalInstruction}

Always relate back to their academic journey. Help them organize their thoughts, explain things in simple terms, quiz them gently if they ask for it, or just do general study talk. Avoid generic, dry responses. Keep it alive and responsive!

KNOWLEDGE CONTEXT (from ${activeBoard} database — use these as your source of truth and ground your answers in this content where appropriate):
${kbContext}

CRITICAL INSTRUCTION:
If the user requests to set up a study schedule/timetable, generate mock tests, update profile interests/styles, or check off/update syllabus compliance trackers, you must perform these actions by appending a single XML tag \`<action>YOUR_JSON_PAYLOAD</action>\` at the very end of your response.
Action JSON schemas:
1. Schedule a session:
{"type": "set_schedule", "slots": [{"subject": "Physics" | "Chemistry" | "Biology" | "Mathematics" | "English" | "History" | "Geography" | "Computer", "topic": "Topic description", "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday", "timeStart": "HH:MM", "timeEnd": "HH:MM"}]}
2. Clear / Delete schedule:
{"type": "clear_schedule", "dayOfWeek": "Monday" | ... (optional), "subject": "..." (optional)}
3. Generate a Mock Test:
{"type": "generate_mock", "subject": "Subject name", "topic": "Topic description", "difficulty": "easy" | "medium" | "hard", "format": "full" | "mcq" | "fill_in_the_blanks" | "short"}
4. Update profile styles/interests:
{"type": "update_profile", "learningStyle": "Socratic" | "Analogy" | "Practical" | "Visual" | "Direct" (optional), "interests": ["interest1", "interest2"] (optional), "strengths": ["subject - topic", ...] (optional), "weaknesses": ["subject - topic", ...] (optional)}
5. Mark syllabus topic status:
{"type": "update_syllabus", "topicId": "phy-s1" | ..., "status": "mastered" | "reviewing" | "not_started", "subject": "...", "topic": "..."}

Here is the exact syllabus topic ID mapping:
For ICSE Board (activeBoard === "ICSE"):
- Physics: "phy-s1" (Moment of Force), "phy-s2" (Mechanical Energy), "phy-s3" (Refraction & Lens), "phy-s4" (Echoes & Vibrations), "phy-s5" (Ohm's Law & Circuits)
- Chemistry: "chem-s1" (Periodic Properties), "chem-s2" (Bond Types), "chem-s3" (Acids, Bases, Salts), "chem-s4" (Reagents Tests), "chem-s5" (Faraday's Laws)
- Biology: "bio-s1" (Mitosis & Meiosis), "bio-s2" (Absorption & Transpiration), "bio-s3" (Circulatory System), "bio-s4" (Excretory System), "bio-s5" (Nervous System)
- Mathematics: "math-s1" (Commercial Maths - GST & Banking), "math-s2" (Algebra - Quadratic Equations), "math-s3" (Algebra - AP & Matrices), "math-s4" (Geometry - Circles & Similarity), "math-s5" (Mensuration - Spherical Shapes)

For CBSE Board (activeBoard === "CBSE"):
- Science: "cbse-sci-1" (Chemical Reactions), "cbse-sci-2" (Acids, Bases & Salts), "cbse-sci-3" (Life Processes), "cbse-sci-4" (Electricity), "cbse-sci-5" (Light - Mirror/Lens)
- Mathematics: "cbse-math-1" (Real Numbers), "cbse-math-2" (Quadratic Equations), "cbse-math-3" (Trig Ratios & Identity), "cbse-math-4" (Circles), "cbse-math-5" (Statistics - Mean, Median, Mode)
- Social Science: "cbse-ss-1" (History - Nationalism in India), "cbse-ss-2" (Geography - Resources & Development), "cbse-ss-3" (Civics - Power Sharing), "cbse-ss-4" (Economics - Sectors of Economy)

Do NOT include any extra text inside the <action> tags except raw JSON. Do not put code fences inside the <action> tags.`;

    // 4. Assemble messages for model
    const messages = [
      { role: 'assistant', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    // 5. Call Model
    const result = await callModel({
      messages,
      temperature: 0.7,
      question: `Second Brain Partner chat: ${message.slice(0, 100)}`,
      preferredModel
    });

    let actionExecuted: any = null;
    let cleanAnswer = result.content || '';

    const actionRegex = /<action>([\s\S]*?)<\/action>/;
    const match = cleanAnswer.match(actionRegex);
    if (match) {
      try {
        const rawJson = match[1].replace(/```json/i, '').replace(/```/g, '').trim();
        const actionData = JSON.parse(rawJson);
        const actionResult = await executeAction(userId, actionData, activeBoard);
        if (actionResult.success) {
          actionExecuted = {
            ...actionData,
            ...actionResult.data
          };
        } else {
          console.warn('Action execution failed:', actionResult.error);
        }
      } catch (e) {
        console.error('Failed to parse or execute action XML block:', e);
      }
      // Strip action tag from output text
      cleanAnswer = cleanAnswer.replace(actionRegex, '').trim();
    }

    return NextResponse.json({
      answer: cleanAnswer,
      reasoning: result.reasoning,
      model: result.model,
      durationMs: result.durationMs,
      actionExecuted,
      sources: retrieved.slice(0, 4).map(c => ({
        title: c.title, subject: c.subject, chapter: c.chapter, category: c.category
      }))
    });
  } catch (err: any) {
    console.error('Partner chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

