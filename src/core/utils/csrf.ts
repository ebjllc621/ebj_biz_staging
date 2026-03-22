/**
 * CSRF Token Utilities - Client-side CSRF protection
 *
 * GOVERNANCE COMPLIANCE:
 * - Phase R4.4 - CSRF Protection Implementation
 * - Double submit cookie pattern
 * - Next.js 14 client-side utilities
 *
 * Features:
 * - Fetch CSRF token from server API
 * - Fetch wrapper with automatic CSRF token inclusion
 * - Automatic header injection for state-changing methods
 *
 * NOTE: The CSRF cookie is HttpOnly, so we CANNOT read it from JavaScript.
 * Instead, we fetch the token from the /api/auth/csrf endpoint which returns
 * the token in the response body while also setting the HttpOnly cookie.
 * The server validates that the header token matches the cookie token.
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.4 - CSRF Protection Implementation
 */

const CSRF_HEADER_NAME = 'x-csrf-token';

// In-memory cache for the CSRF token (fetched from API)
let cachedCsrfToken: string | null = null;

/**
 * Fetch CSRF token from the server API
 *
 * NOTE: The CSRF cookie is HttpOnly and cannot be read from JavaScript.
 * We must fetch from /api/auth/csrf endpoint which returns the token
 * in the response body.
 *
 * @returns CSRF token string or null if failed
 *
 * @example
 * ```typescript
 * const token = await fetchCsrfToken();
 * if (token) {
 *   headers['x-csrf-token'] = token;
 * }
 * ```
 */
export async function fetchCsrfToken(): Promise<string | null> {
  // Return cached token if available
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include', // Include cookies in request
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.ok && data.data?.csrfToken) {
      cachedCsrfToken = data.data.csrfToken;
      return cachedCsrfToken;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the cached CSRF token
 * Call this after logout or when token may be invalid
 */
export function clearCsrfToken(): void {
  cachedCsrfToken = null;
}

/**
 * Get CSRF token (synchronous - returns cached value)
 *
 * NOTE: This returns the cached token set by fetchCsrfToken().
 * If no token is cached, returns null. Call fetchCsrfToken() first
 * to populate the cache.
 *
 * @returns CSRF token string or null if not cached
 *
 * @example
 * ```typescript
 * // Ensure token is fetched first
 * await fetchCsrfToken();
 * const token = getCsrfToken();
 * ```
 */
export function getCsrfToken(): string | null {
  return cachedCsrfToken;
}

/**
 * Fetch with CSRF token
 * Automatically includes CSRF token for POST/PUT/DELETE/PATCH requests
 *
 * @param url - Request URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Promise<Response>
 *
 * @example
 * ```typescript
 * const response = await fetchWithCsrf('/api/listings', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'New Listing' })
 * });
 *
 * if (response.ok) {
 *   const data = await response.json();
 *   console.log('Created:', data);
 * }
 * ```
 *
 * @example GET request (CSRF token not required)
 * ```typescript
 * const response = await fetchWithCsrf('/api/listings');
 * const listings = await response.json();
 * ```
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();

  // Only add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // Fetch token if not cached
    const token = await fetchCsrfToken();

    // Initialize headers if not provided
    const headers = new Headers(options.headers || {});

    // Add CSRF token header
    if (token) {
      headers.set(CSRF_HEADER_NAME, token);
    }

    // Ensure Content-Type is set for JSON requests (but NOT for FormData)
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Ensure credentials are included (required for cookies)
    options.headers = headers;
    options.credentials = options.credentials || 'include';
  } else {
    // For GET requests, still include credentials for session cookies
    options.credentials = options.credentials || 'include';
  }

  return fetch(url, options);
}

/**
 * Check if CSRF token is cached
 * Useful for debugging or checking if token needs to be fetched
 *
 * @returns true if CSRF token is cached, false otherwise
 *
 * @example
 * ```typescript
 * if (!hasCsrfToken()) {
 *   await fetchCsrfToken();
 * }
 * ```
 */
export function hasCsrfToken(): boolean {
  return cachedCsrfToken !== null;
}
