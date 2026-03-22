/**
 * Link builder for email actions: verifyEmail, passwordReset.
 * Adds integrity tag `sig` computed over canonical string.
 * GOVERNANCE: Parameter Naming Authority - camelCase query params
 * GOVERNANCE: OSI Production - HMAC integrity protection against tampering
 */
import { signHmac, verifyHmac } from '@/lib/crypto/hmac';

export type Purpose = 'verifyEmail' | 'passwordReset';

export type ActionParams = {
  origin: string; // e.g., https://app.bizconekt.com
  uid: number;    // numeric user id
  token: string;  // opaque token (server holds hash)
  purpose: Purpose;
  t?: number;     // unix seconds
};

function canonical(p: Required<Omit<ActionParams, 'origin'>>) {
  return `${p.purpose}|${p.uid}|${p.token}|${p.t}`;
}

export async function buildLink(secret: string, p: ActionParams): Promise<URL> {
  const t = p.t ?? Math.floor(Date.now() / 1000);
  const payload = { purpose: p.purpose, uid: p.uid, token: p.token, t } as const;
  const sig = await signHmac(secret, canonical(payload));
  const url = new URL('/auth/action', p.origin);
  url.searchParams.set('purpose', payload.purpose);
  url.searchParams.set('uid', String(payload.uid));
  url.searchParams.set('token', payload.token);
  url.searchParams.set('t', String(payload.t));
  url.searchParams.set('sig', sig);
  return url;
}

export async function verifyParams(secret: string, url: URL): Promise<boolean> {
  const purpose = url.searchParams.get('purpose');
  const uid = Number(url.searchParams.get('uid'));
  const token = url.searchParams.get('token');
  const t = Number(url.searchParams.get('t'));
  const sig = url.searchParams.get('sig') ?? '';
  if (!purpose || !token || !sig || !Number.isFinite(uid) || !Number.isFinite(t)) return false;
  const payload = { purpose: purpose as Purpose, uid, token, t } as const;
  return verifyHmac(secret, canonical(payload), sig);
}