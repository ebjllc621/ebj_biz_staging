/**
 * SecurityService - Centralized Security Configuration
 *
 * GOVERNANCE COMPLIANCE:
 * - OWASP Top 10 security controls
 * - Production security headers
 * - Build Map v2.1 ENHANCED patterns
 * - Tier: SIMPLE
 *
 * @authority PHASE_6.4_BRAIN_PLAN.md - Section 3.2.3
 * @phase Phase 6.4 - Production Deployment
 * @complexity SIMPLE tier
 */

export class SecurityService {
  /**
   * Get Content Security Policy header value
   * @returns CSP header string
   *
   * @example
   * ```typescript
   * const csp = SecurityService.getCSPHeader();
   * response.headers.set('Content-Security-Policy', csp);
   * ```
   */
  static getCSPHeader(): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: http:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com",
      "frame-src 'self' https://www.facebook.com https://www.youtube.com https://player.vimeo.com https://www.dailymotion.com https://rumble.com https://www.tiktok.com",
      isDevelopment ? "upgrade-insecure-requests" : "",
    ].filter(Boolean).join('; ');
  }

  /**
   * Get allowed CORS origins
   * @returns Array of allowed origins
   *
   * @example
   * ```typescript
   * const origins = SecurityService.getAllowedOrigins();
   * ```
   */
  static getAllowedOrigins(): string[] {
    const originsEnv = process.env.ALLOWED_ORIGINS || '';
    const origins = originsEnv.split(',').map(o => o.trim()).filter(Boolean);

    if (origins.length === 0) {
      // Default to base URL if not configured
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return [baseUrl];
    }

    return origins;
  }

  /**
   * Validate origin for CORS
   * @param origin - Origin to validate
   * @returns Boolean indicating allowed origin
   *
   * @example
   * ```typescript
   * if (SecurityService.isOriginAllowed(origin)) {
   *   // Allow CORS request
   * }
   * ```
   */
  static isOriginAllowed(origin: string): boolean {
    const allowedOrigins = this.getAllowedOrigins();
    return allowedOrigins.includes(origin);
  }

  /**
   * Sanitize user input (prevent XSS)
   * @param input - User input string
   * @returns Sanitized string
   *
   * @example
   * ```typescript
   * const safe = SecurityService.sanitizeInput(userInput);
   * ```
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
