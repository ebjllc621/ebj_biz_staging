export function ensureRequestId(h: Headers): string {
  const existing = h.get('x-request-id') || h.get('x-requestid') || '';
  try { 
    return existing || crypto.randomUUID(); 
  } catch { 
    return existing || String(Date.now()); 
  }
}

export function nowMs(): number {
  return Number(process.hrtime.bigint() / 1000000n);
}

export function logJson(obj: unknown): void {
  try {
    
  } catch {
    // noop
  }
}