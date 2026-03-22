// GOVERNANCE: httpOnly cookies ONLY for authentication
// Source: mandatory-verification-protocol.mdc - Cookie Policy
// GOVERNANCE: credentials: 'include' for authenticated requests
// Source: unified-bizconekt-rules.mdc - Security Standards

import { cookies } from "next/headers";

const NAME = "bk_session";
const OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
};

/**
 * Set session cookie with httpOnly flag
 * @param token - Session token to store
 * @param maxAge - Cookie max age in seconds
 */
export function setSessionCookie(token: string, maxAge: number): void {
  cookies().set(NAME, token, { ...OPTIONS, maxAge });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(): void {
  cookies().delete(NAME);
}

/**
 * Read session cookie value
 * @returns Session token or null if not found
 */
export function readSessionCookie(): string | null {
  return cookies().get(NAME)?.value || null;
}
