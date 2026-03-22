/**
 * CSRF Protection Utility - Double Submit Pattern Implementation
 *
 * Implements CSRF protection using cookie + header validation.
 * Stateless approach that doesn't require session binding.
 */

const COOKIE = 'bk_xsrf';
const HEADER = 'x-csrf-token';

/**
 * Get the CSRF cookie name
 */
export function cookieName(): string {
  return COOKIE;
}

/**
 * Get the CSRF header name
 */
export function headerName(): string {
  return HEADER;
}

/**
 * Create a new CSRF token and cookie configuration
 *
 * In development (non-HTTPS), the Secure flag is omitted to allow
 * cross-machine testing on local network. In production, Secure is required.
 *
 * @returns Object containing cookie name, value, and secure attributes
 */
export function createCsrfCookie(): { name: string; value: string; attributes: string } {
  // Generate cryptographically secure token (UUID without hyphens)
  const value = crypto.randomUUID().replace(/-/g, '');

  // Determine if we're in production (HTTPS required)
  const isProduction = process.env.NODE_ENV === 'production';

  // Secure cookie attributes for CSRF protection
  // - Secure flag only in production (requires HTTPS)
  // - SameSite=Lax allows same-site requests and top-level navigations
  const attributes = isProduction
    ? 'Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=1800'
    : 'Path=/; HttpOnly; SameSite=Lax; Max-Age=1800';

  return {
    name: COOKIE,
    value,
    attributes
  };
}

/**
 * Parse and extract a specific cookie value from request headers
 *
 * @param headers - Request headers
 * @param name - Cookie name to extract
 * @returns Cookie value or null if not found
 */
export function readCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get('cookie') || '';
  const parts = cookie.split(/;\s*/);

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === name) {
      return value || '';
    }
  }

  return null;
}

/**
 * Validate CSRF protection using double-submit pattern
 *
 * Validates that:
 * 1. CSRF header is present
 * 2. CSRF cookie is present
 * 3. Header value exactly matches cookie value
 *
 * @param req - Request object to validate
 * @returns true if CSRF validation passes, false otherwise
 */
export function validateCsrf(req: Request): boolean {
  // Extract CSRF token from header
  const tokenHeader = req.headers.get(HEADER);
  if (!tokenHeader) {
    return false;
  }

  // Extract CSRF token from cookie
  const tokenCookie = readCookie(req.headers, COOKIE);
  if (!tokenCookie) {
    return false;
  }

  // Double-submit validation: header must exactly match cookie
  return tokenHeader === tokenCookie;
}