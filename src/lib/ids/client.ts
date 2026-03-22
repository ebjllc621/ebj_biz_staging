export const CLIENT_COOKIE = 'bnk_cid';

export function parseCookies(h: Headers): Record<string, string> {
  const raw = h.get('cookie') || '';
  const obj: Record<string, string> = {};
  raw.split(';').map(s => s.trim()).filter(Boolean).forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) {
      obj[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1));
    }
  });
  return obj;
}

export function ensureClientIdOnApi(req: Request, resHeaders: Headers): string {
  const cookies = parseCookies(req.headers);
  let cid = cookies[CLIENT_COOKIE];
  if (!cid) {
    try {
      cid = crypto.randomUUID();
    } catch {
      cid = String(Date.now());
    }
    resHeaders.append('Set-Cookie', `${CLIENT_COOKIE}=${encodeURIComponent(cid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  }
  return cid;
}

export function ensureClientIdHeader(h: Headers): string {
  const existing = h.get('x-client-id') || '';
  try {
    return existing || crypto.randomUUID();
  } catch {
    return existing || String(Date.now());
  }
}