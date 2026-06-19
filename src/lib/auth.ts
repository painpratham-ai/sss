// Simple auth library — cookie-based sessions, bcrypt password hashing
// No NextAuth complexity — just email + password + board preference
import bcrypt from 'bcryptjs';
import { db } from './db';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'icse_cbse_session';
const SESSION_EXPIRY_DAYS = 30;

// In-memory session store (sessionId → userId). For production, use Redis/DB.
const sessions = new Map<string, { userId: string; expires: Date }>();

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  board: string;
  className: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: string): string {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_EXPIRY_DAYS);
  sessions.set(sessionId, { userId, expires });
  return sessionId;
}

export async function getUserFromSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  if (session.expires < new Date()) {
    sessions.delete(sessionId);
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, board: true, className: true }
  });

  return user;
}

export function setSessionCookie(sessionId: string): string {
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${sessionId}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
