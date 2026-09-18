import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AppError } from './errors';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

const SESSION_COOKIE_NAME = 'glp_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate HMAC SHA-256 signature for token
async function signData(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Buffer.from(signature).toString('base64url');
}

async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBuffer = Buffer.from(signature, 'base64url');
  return crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(data));
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const secret = process.env.AUTH_SECRET || 'fallback-secret-for-development-only-32';
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = await signData(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secret = process.env.AUTH_SECRET || 'fallback-secret-for-development-only-32';
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadEncoded, signature] = parts;
    const isValid = await verifySignature(payloadEncoded, signature, secret);
    if (!isValid) return null;

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export async function requireAuthUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw AppError.unauthorized('You must be logged in to perform this action');
  }
  return user;
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
