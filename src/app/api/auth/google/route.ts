import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();
    if (!credential) {
      return NextResponse.json({ error: 'Google credential token is required' }, { status: 400 });
    }

    // Check if the token is a mock token or a real Google token
    let email: string;
    let name: string;

    if (credential.endsWith('.fake_signature')) {
      // Decode JWT token payload (middle part, base64url encoded)
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return NextResponse.json({ error: 'Invalid mock token format' }, { status: 400 });
      }
      try {
        const decodedPayload = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(decodedPayload);
        email = payload.email;
        name = payload.name;
      } catch (e) {
        return NextResponse.json({ error: 'Failed to decode mock credential payload' }, { status: 400 });
      }
    } else {
      // Real Google login: verify with Google's official tokeninfo endpoint
      try {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokenInfoRes.ok) {
          const errorData = await tokenInfoRes.text();
          return NextResponse.json({ error: `Google token verification failed: ${errorData}` }, { status: 400 });
        }
        const payload = await tokenInfoRes.json();
        email = payload.email;
        name = payload.name;
      } catch (err: any) {
        return NextResponse.json({ error: `Network error verifying Google token: ${err.message}` }, { status: 500 });
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Email not found in Google credential' }, { status: 400 });
    }

    // Find or create the user
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Create user with a dummy secure password
      const secureRandomPassword = Math.random().toString(36) + Date.now().toString();
      const hashedPassword = await hashPassword(secureRandomPassword);
      
      user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          name: name || null,
          password: hashedPassword,
          board: 'ICSE', // Default board
          className: '10' // Default class
        }
      });
    }

    const sessionId = createSession(user.id);
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        board: user.board,
        className: user.className
      }
    });

    res.headers.set('Set-Cookie', setSessionCookie(sessionId));
    return res;
  } catch (err: any) {
    console.error('Google Auth API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
