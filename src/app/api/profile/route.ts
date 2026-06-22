import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';
import { callModel } from '@/lib/models';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Deterministic heuristic fallback logic
function computeProfileHeuristic(events: any[], currentProfile: any) {
  const habits = {
    consistency: 60,
    testsTaken: 0,
    flashcardsReviewed: 0,
    simulationsCompleted: 0
  };

  const strengthsMap = new Set<string>();
  const weaknessesMap = new Set<string>();
  const interestsMap = new Set<string>();
  const memoryLogMap = new Set<string>();
  
  let socraticCount = 0;
  let analogyCount = 0;
  let practicalCount = 0;

  // Read existing data if any
  if (currentProfile) {
    try {
      JSON.parse(currentProfile.interests || '[]').forEach((i: string) => interestsMap.add(i));
      JSON.parse(currentProfile.strengths || '[]').forEach((s: string) => strengthsMap.add(s));
      JSON.parse(currentProfile.weaknesses || '[]').forEach((w: string) => weaknessesMap.add(w));
      JSON.parse(currentProfile.memoryLog || '[]').forEach((m: string) => memoryLogMap.add(m));
      const parsedHabits = JSON.parse(currentProfile.studyHabits || '{}');
      habits.consistency = parsedHabits.consistency ?? 60;
    } catch (e) {}
  }

  events.forEach((evt) => {
    let metadata: any = {};
    try {
      metadata = evt.metadata ? JSON.parse(evt.metadata) : {};
    } catch (e) {}

    const label = `${evt.subject} - ${evt.topic}`;

    if (evt.eventType === 'tutor_chat') {
      if (metadata.socratic) socraticCount++;
      if (metadata.analogy) analogyCount++;
      
      // Basic interest parser from message content
      const msg = (metadata.message || '').toLowerCase();
      const interestKeywords = ['game', 'cricket', 'space', 'robot', 'football', 'coding', 'music', 'movie', 'history'];
      interestKeywords.forEach(word => {
        if (msg.includes(word)) {
          interestsMap.add(word);
        }
      });
    }

    if (evt.eventType === 'flashcard_recall') {
      habits.flashcardsReviewed++;
      if (metadata.recallLevel === 'easy') {
        strengthsMap.add(label);
        weaknessesMap.delete(label);
      } else if (metadata.recallLevel === 'forgot') {
        weaknessesMap.add(label);
        strengthsMap.delete(label);
        // Add question to memory log
        memoryLogMap.add(`Flashcard recall failure on: ${evt.topic}`);
      }
    }

    if (evt.eventType === 'simulator_run') {
      habits.simulationsCompleted++;
      practicalCount++;
      strengthsMap.add(`${evt.subject} Practical - ${evt.topic}`);
    }

    if (evt.eventType === 'syllabus_toggle') {
      if (metadata.action === 'mastered') {
        strengthsMap.add(label);
        weaknessesMap.delete(label);
      }
    }

    if (evt.eventType === 'mock_test') {
      habits.testsTaken++;
      const score = metadata.score ?? 0;
      const maxMarks = metadata.maxMarks ?? 100;
      const percent = maxMarks > 0 ? (score / maxMarks) * 100 : 0;

      if (percent >= 70) {
        strengthsMap.add(label);
        weaknessesMap.delete(label);
      } else if (percent < 50) {
        weaknessesMap.add(label);
        strengthsMap.delete(label);
        memoryLogMap.add(`Struggled in Mock Test: ${evt.topic} (Scored ${Math.round(percent)}%)`);
      }
    }

    if (evt.eventType === 'task_completed') {
      strengthsMap.add(label);
      weaknessesMap.delete(label);
    }

    if (evt.eventType === 'task_delayed') {
      weaknessesMap.add(label);
      strengthsMap.delete(label);
      if (metadata.reason) {
        memoryLogMap.add(`Delayed "${evt.topic}": ${metadata.reason}`);
      } else {
        memoryLogMap.add(`Delayed task: ${evt.topic}`);
      }
    }

    if (evt.eventType === 'project_forge') {
      strengthsMap.add(label);
      weaknessesMap.delete(label);
      memoryLogMap.add(`Forged project: ${evt.topic}`);
    }
  });

  // Calculate consistency score
  const totalActions = events.length;
  habits.consistency = Math.min(100, 60 + Math.min(40, totalActions * 2));

  // Determine dominant learning style
  let learningStyle = 'Direct';
  if (practicalCount >= 2 && practicalCount >= socraticCount && practicalCount >= analogyCount) {
    learningStyle = 'Practical';
  } else if (socraticCount >= 2 && socraticCount >= analogyCount) {
    learningStyle = 'Socratic';
  } else if (analogyCount >= 2) {
    learningStyle = 'Analogy';
  } else if (practicalCount > 0) {
    learningStyle = 'Practical';
  }

  return {
    learningStyle,
    interests: Array.from(interestsMap).slice(0, 8),
    strengths: Array.from(strengthsMap).slice(0, 8),
    weaknesses: Array.from(weaknessesMap).slice(0, 8),
    studyHabits: habits,
    memoryLog: Array.from(memoryLogMap).slice(0, 8)
  };
}

export async function GET() {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    let profile = await db.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await db.studentProfile.create({
        data: {
          userId,
          learningStyle: 'Direct',
          interests: '[]',
          strengths: '[]',
          weaknesses: '[]',
          studyHabits: JSON.stringify({
            consistency: 60,
            testsTaken: 0,
            flashcardsReviewed: 0,
            simulationsCompleted: 0
          }),
          memoryLog: '[]'
        }
      });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error('Failed to get student profile:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    const userId = user?.id || 'guest';

    // Check if the request contains an onboarding update body
    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      // Fallback if request has no body (e.g. background sync)
    }

    if (body && body.action === 'update') {
      const data = body.profileData;
      const currentProfile = await db.studentProfile.findUnique({
        where: { userId }
      });

      // Keep existing study habits and memory log if they exist, otherwise use defaults
      const existingHabits = currentProfile?.studyHabits 
        ? JSON.parse(currentProfile.studyHabits) 
        : { consistency: 60, testsTaken: 0, flashcardsReviewed: 0, simulationsCompleted: 0 };

      const existingMemoryLog = currentProfile?.memoryLog 
        ? JSON.parse(currentProfile.memoryLog) 
        : [];

      const updated = await db.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          learningStyle: data.learningStyle || 'Direct',
          interests: JSON.stringify(data.interests || []),
          strengths: JSON.stringify(data.strengths || []),
          weaknesses: JSON.stringify(data.weaknesses || []),
          studyHabits: JSON.stringify(existingHabits),
          memoryLog: JSON.stringify(existingMemoryLog),
          lastAIExtraction: new Date()
        },
        update: {
          learningStyle: data.learningStyle || 'Direct',
          interests: JSON.stringify(data.interests || []),
          strengths: JSON.stringify(data.strengths || []),
          weaknesses: JSON.stringify(data.weaknesses || []),
          lastAIExtraction: new Date()
        }
      });

      return NextResponse.json({
        profile: updated,
        synced: true,
        aiSynced: false,
        message: 'Second Brain profile successfully personalized!'
      });
    }

    // Get all events for the user
    const events = await db.studyEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const currentProfile = await db.studentProfile.findUnique({
      where: { userId }
    });

    // Run heuristic parsing as baseline and primary fallback
    const fallbackProfile = computeProfileHeuristic(events, currentProfile);

    if (events.length === 0) {
      return NextResponse.json({
        profile: currentProfile || await db.studentProfile.create({
          data: {
            userId,
            learningStyle: 'Direct',
            interests: '[]',
            strengths: '[]',
            weaknesses: '[]',
            studyHabits: JSON.stringify(fallbackProfile.studyHabits),
            memoryLog: '[]'
          }
        }),
        synced: false,
        message: 'No study activities logged yet. Get active in other tabs!'
      });
    }

    // Try AI-powered profile synchronization
    let finalProfile = fallbackProfile;
    let syncedViaAI = false;

    try {
      const summaryText = events.map(evt => {
        let details = '';
        try {
          details = evt.metadata ? JSON.parse(evt.metadata) : {};
          details = JSON.stringify(details);
        } catch (e) {
          details = evt.metadata;
        }
        return `[Event] ${evt.eventType} | Subject: ${evt.subject} | Topic: ${evt.topic} | Details: ${details}`;
      }).join('\n');

      const systemPrompt = `You are the Student Second Brain AI Sync Engine.
Analyze the student's study events and output an updated cognitive and academic profile.
Note that events include standard activities plus Task Manager events like "task_completed", "task_delayed" (with "reason" field in details), and "project_forge".

Decide:
1. learningStyle: one of [Socratic, Analogy, Visual, Practical, Direct].
2. interests: A list of interests (gaming, sports, music, etc.) extracted from questions.
3. strengths: topics they checked off as completed tasks, scored >=70%, mastered in syllabus, or successfully forged projects.
4. weaknesses: topics they delayed/rescheduled (especially with difficulty reasons), struggled with, failed in checkpoints, or forgot.
5. studyHabits: compute consistency (0-100), total tests taken, flashcards reviewed, simulations run, and overall progression based on logs.
6. memoryLog: Short, actionable lists of specific rules, formulas, definitions, or study obstacles the student struggled with (including specific delay reasons from rescheduling tasks).

Respond ONLY with valid JSON, no markdown fences, no extra prose:
{
  "learningStyle": "Socratic" | "Analogy" | "Visual" | "Practical" | "Direct",
  "interests": ["interest1", "interest2"],
  "strengths": ["subject - topic", ...],
  "weaknesses": ["subject - topic", ...],
  "studyHabits": {
    "consistency": 85,
    "testsTaken": 2,
    "flashcardsReviewed": 10,
    "simulationsCompleted": 4
  },
  "memoryLog": ["Faraday's Law: m = Z * I * t", "Lens formula: 1/f = 1/v - 1/u"]
}`;

      const aiResponse = await callModel({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: `Here are the student's study events:\n${summaryText}` }
        ],
        temperature: 0.3,
        question: 'Extract cognitive student profile from study logs',
        preferredModel: 'auto'
      });

      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.learningStyle && Array.isArray(parsed.interests)) {
          finalProfile = {
            learningStyle: parsed.learningStyle,
            interests: parsed.interests.slice(0, 8),
            strengths: (parsed.strengths || []).slice(0, 8),
            weaknesses: (parsed.weaknesses || []).slice(0, 8),
            studyHabits: {
              consistency: parsed.studyHabits?.consistency ?? fallbackProfile.studyHabits.consistency,
              testsTaken: parsed.studyHabits?.testsTaken ?? fallbackProfile.studyHabits.testsTaken,
              flashcardsReviewed: parsed.studyHabits?.flashcardsReviewed ?? fallbackProfile.studyHabits.flashcardsReviewed,
              simulationsCompleted: parsed.studyHabits?.simulationsCompleted ?? fallbackProfile.studyHabits.simulationsCompleted
            },
            memoryLog: (parsed.memoryLog || []).slice(0, 8)
          };
          syncedViaAI = true;
        }
      }
    } catch (aiErr) {
      console.warn('AI Brain sync failed, using deterministic heuristics fallback:', aiErr);
    }

    // Save to DB
    const updated = await db.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        learningStyle: finalProfile.learningStyle,
        interests: JSON.stringify(finalProfile.interests),
        strengths: JSON.stringify(finalProfile.strengths),
        weaknesses: JSON.stringify(finalProfile.weaknesses),
        studyHabits: JSON.stringify(finalProfile.studyHabits),
        memoryLog: JSON.stringify(finalProfile.memoryLog),
        lastAIExtraction: new Date()
      },
      update: {
        learningStyle: finalProfile.learningStyle,
        interests: JSON.stringify(finalProfile.interests),
        strengths: JSON.stringify(finalProfile.strengths),
        weaknesses: JSON.stringify(finalProfile.weaknesses),
        studyHabits: JSON.stringify(finalProfile.studyHabits),
        memoryLog: JSON.stringify(finalProfile.memoryLog),
        lastAIExtraction: new Date()
      }
    });

    return NextResponse.json({
      profile: updated,
      synced: true,
      aiSynced: syncedViaAI,
      message: syncedViaAI 
        ? 'Second Brain successfully synchronized using AI!'
        : 'Second Brain synchronized using study log analytics!'
    });
  } catch (err: any) {
    console.error('Failed to sync student profile:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
