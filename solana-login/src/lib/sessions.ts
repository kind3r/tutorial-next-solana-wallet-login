"use server"

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { SessionPayload } from "./types/session";

const sessionKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// Create a session token
export async function sessionEncrypt(payload: SessionPayload, expires: string | number | Date = "7d"): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(sessionKey);
}

// Verify a session token
export async function sessionDecrypt(session: string | undefined = ''): Promise<SessionPayload | void> {
  try {
    const { payload } = await jwtVerify(session, sessionKey, {
      algorithms: ['HS256'],
    })
    return payload as SessionPayload;
  } catch (error) {
    console.error(error);
    console.log('Failed to verify session');
  }
}

// Create a session cookie with the token
export async function sessionCreate(wallet: string, expires: number = 7 * 24 * 60 * 60): Promise<void> {
  const expiresAt = new Date(Date.now() + expires * 1000);
  const session = await sessionEncrypt({ w: wallet }, expiresAt);

  cookies().set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}