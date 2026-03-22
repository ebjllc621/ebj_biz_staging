/**
 * AUTH-P1-1F-001: PII Redaction utilities for audit logging
 *
 * @fileoverview Provides utilities to mask emails, strip sensitive tokens,
 * and normalize IP addresses and User-Agent strings for audit compliance.
 *
 * @governance OSI Production L6: Session-layer PII redaction policy
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 */

/**
 * Masks an email address for audit logging while preserving domain information.
 *
 * Transforms: user@example.com -> u***@example.com
 * Transforms: verylongusername@company.org -> v***@company.org
 *
 * @param email - Email address to mask
 * @returns Masked email with first character + *** + full domain
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '[invalid-email]';
  }

  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    return '[malformed-email]';
  }

  const localPart = email.substring(0, atIndex);
  const domain = email.substring(atIndex);

  if (localPart.length === 0) {
    return `[empty-local]${domain}`;
  }

  if (localPart.length === 1) {
    return `${localPart}***${domain}`;
  }

  return `${localPart.charAt(0)}***${domain}`;
}

/**
 * Strips sensitive metadata from objects before logging.
 *
 * Removes: password, token, accessToken, refreshToken, secret, key
 * Preserves: All other fields for audit context
 *
 * @param meta - Metadata object that may contain sensitive fields
 * @returns Sanitized metadata object safe for logging
 */
export function safeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  const sensitiveFields = new Set([
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'key',
    'privateKey',
    'sessionToken',
    'authToken',
    'verificationToken',
    'resetToken'
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();

    // Check if field name contains sensitive keywords
    const isSensitive = sensitiveFields.has(lowerKey) ||
                       lowerKey.includes('password') ||
                       lowerKey.includes('token') ||
                       lowerKey.includes('secret') ||
                       lowerKey.includes('key');

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      // Recursively sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = safeMeta(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Masks IP address for audit logging while preserving network context.
 *
 * IPv4: 192.168.1.100 -> 192.168.***.***
 * IPv6: 2001:db8::1 -> 2001:db8:***
 *
 * @param ip - IP address to mask
 * @returns Masked IP address with first two octets/segments visible
 */
export function maskIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  return '***';
}

/**
 * Truncates and masks User-Agent string for audit logging.
 *
 * Preserves first 24 characters to identify browser/client type
 * while protecting detailed version and system information.
 *
 * @param userAgent - User-Agent string to mask
 * @returns Truncated User-Agent (max 24 chars) + indicator if truncated
 */
export function maskUa(ua?: string | null): string | undefined {
  if (!ua) return undefined;
  return ua.slice(0, 24) + (ua.length > 24 ? '…' : '');
}

/**
 * Creates a complete redacted audit context from raw request data.
 *
 * Combines all redaction utilities to create a safe audit context
 * that can be logged without PII concerns.
 *
 * @param context - Raw context that may contain PII
 * @returns Fully redacted context safe for audit logging
 */
export interface AuditContext {
  email?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

export function createSafeAuditContext(context: {
  email?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}): AuditContext {
  const safeContext: AuditContext = {};

  if (context.email) {
    safeContext.email = maskEmail(context.email);
  }

  if (context.ip) {
    safeContext.ip = maskIp(context.ip);
  }

  if (context.userAgent) {
    safeContext.userAgent = maskUa(context.userAgent);
  }

  if (context.meta) {
    safeContext.meta = safeMeta(context.meta);
  }

  return safeContext;
}