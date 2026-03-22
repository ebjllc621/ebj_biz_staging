/**
 * HMAC utilities using Web Crypto API (SubtleCrypto)
 * GOVERNANCE: OSI Production compliance - integrity protection for auth actions
 */

async function importKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signHmac(secret: string, data: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Buffer.from(new Uint8Array(sig)).toString('base64url');
}

export async function verifyHmac(secret: string, data: string, signature: string): Promise<boolean> {
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, Buffer.from(signature, 'base64url'), new TextEncoder().encode(data));
  return ok;
}