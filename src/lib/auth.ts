import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { AppError } from './errors';
import { AccountStatus } from '@prisma/client';

export type UserRoleType = 'LEARNER' | 'CONTENT_EDITOR' | 'SUPPORT' | 'ADMIN' | 'OWNER' | 'USER';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleType;
  status?: AccountStatus;
  sessionId?: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  isCurrent: boolean;
}

export const SESSION_COOKIE_NAME = 'glp_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Computes SHA-256 hash of a string (token or IP)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates cryptographically secure random token (32 bytes = 64 hex characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extracts client metadata from Next.js Headers
 */
export function extractClientMetadata(headers?: Headers): { userAgent: string | null; ipHash: string | null } {
  if (!headers) return { userAgent: null, ipHash: null };

  const ua = headers.get('user-agent')?.slice(0, 256) || null;
  const xff = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = xff ? xff.split(',')[0].trim() : realIp || null;
  const ipHash = ip ? hashToken(ip).slice(0, 32) : null;

  return { userAgent: ua, ipHash };
}

/**
 * Creates a persistent revocable session in PostgreSQL
 */
export async function createPersistentSession(
  userId: string,
  headers?: Headers
): Promise<{ token: string; sessionId: string }> {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const { userAgent, ipHash } = extractClientMetadata(headers);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent,
      ipHash,
      expiresAt,
      lastSeenAt: new Date(),
    },
  });

  return { token, sessionId: session.id };
}

/**
 * Legacy HMAC signing support for backward compatibility during rolling migration
 */
async function verifyLegacyHmacToken(token: string): Promise<{ sub: string; name: string; email: string; role: UserRoleType } | null> {
  try {
    const secret = process.env.AUTH_SECRET || 'fallback-secret-for-development-only-32';
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadEncoded, signature] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBuffer = Buffer.from(signature, 'base64url');
    const isValid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(payloadEncoded));
    if (!isValid) return null;

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a session token string against database sessions
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (session) {
    // Check if session has been revoked or expired
    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      return null;
    }

    // Check if user account is suspended, banned, or deleted
    if (session.user.status !== AccountStatus.ACTIVE) {
      return null;
    }

    // Throttle lastSeenAt updates to once per 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (session.lastSeenAt.getTime() < fiveMinutesAgo) {
      prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      }).catch(() => null);
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role as UserRoleType,
      status: session.user.status,
      sessionId: session.id,
    };
  }

  // Fallback to legacy HMAC verification
  const legacyPayload = await verifyLegacyHmacToken(token);
  if (legacyPayload) {
    const user = await prisma.user.findUnique({
      where: { id: legacyPayload.sub },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    if (user && user.status === AccountStatus.ACTIVE) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRoleType,
        status: user.status,
      };
    }
  }

  return null;
}

/**
 * Retrieves the currently authenticated session user from request cookies
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

/**
 * Asserts that the request is authenticated with an ACTIVE account
 */
export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw AppError.unauthorized('You must be logged in to perform this action');
  }
  if (user.status && user.status !== AccountStatus.ACTIVE) {
    throw AppError.forbidden(`Your account is currently ${user.status.toLowerCase()}`);
  }
  return user;
}

/**
 * Sets session cookie by creating a persistent database session
 */
export async function setSessionCookie(
  user: { id: string },
  headers?: Headers
): Promise<string> {
  const { token } = await createPersistentSession(user.id, headers);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return token;
}

/**
 * Clears session cookie and marks the persistent session revoked in DB
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => null);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Revokes a single session by ID for a user
 */
export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

/**
 * Revokes all sessions for a user, optionally exempting a specific session (e.g. current device)
 */
export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/**
 * Lists all active sessions for a user
 */
export async function listUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      userAgent: true,
      ipHash: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipHash: s.ipHash,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    isCurrent: Boolean(currentSessionId && s.id === currentSessionId),
  }));
}
