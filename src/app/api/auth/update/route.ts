import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { name, board, className, learningStyle, interests, strengths, weaknesses, targetScore, painPoint, tutorPersona } = body;

    // 1. Update the User record in database
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? name : undefined,
        board: board !== undefined ? board : undefined,
        className: className !== undefined ? className : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        board: true,
        className: true
      }
    });

    // 2. Upsert the StudentProfile matching choices
    let updatedProfile: any = null;
    if (learningStyle !== undefined || interests !== undefined || strengths !== undefined || weaknesses !== undefined || targetScore !== undefined || painPoint !== undefined || tutorPersona !== undefined) {
      const currentProfile = await db.studentProfile.findUnique({
        where: { userId: user.id }
      });

      const existingHabits = currentProfile?.studyHabits
        ? JSON.parse(currentProfile.studyHabits)
        : { consistency: 60, testsTaken: 0, flashcardsReviewed: 0, simulationsCompleted: 0 };

      if (targetScore !== undefined) existingHabits.targetScore = targetScore;
      if (painPoint !== undefined) existingHabits.painPoint = painPoint;
      if (tutorPersona !== undefined) existingHabits.tutorPersona = tutorPersona;

      const existingMemoryLog = currentProfile?.memoryLog
        ? JSON.parse(currentProfile.memoryLog)
        : [];

      updatedProfile = await db.studentProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          learningStyle: learningStyle || 'Direct',
          interests: JSON.stringify(interests || []),
          strengths: JSON.stringify(strengths || []),
          weaknesses: JSON.stringify(weaknesses || []),
          studyHabits: JSON.stringify(existingHabits),
          memoryLog: JSON.stringify(existingMemoryLog),
          lastAIExtraction: new Date()
        },
        update: {
          learningStyle: learningStyle !== undefined ? learningStyle : undefined,
          interests: interests !== undefined ? JSON.stringify(interests) : undefined,
          strengths: strengths !== undefined ? JSON.stringify(strengths) : undefined,
          weaknesses: weaknesses !== undefined ? JSON.stringify(weaknesses) : undefined,
          studyHabits: JSON.stringify(existingHabits),
          lastAIExtraction: new Date()
        }
      });
    }

    return NextResponse.json({
      user: updatedUser,
      profile: updatedProfile,
      message: 'Onboarding settings successfully applied.'
    });
  } catch (err: any) {
    console.error('Failed to update onboarding choices:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
