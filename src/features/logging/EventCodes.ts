/**
 * AUTH-P1-1F-001: Stable audit event codes for authentication flows
 *
 * @fileoverview Defines stable event codes for audit logging across auth operations.
 * These codes MUST remain stable across versions to maintain audit consistency.
 *
 * @governance OSI Production L7: Application-layer structured event codes
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 */

/**
 * Stable event codes for authentication audit logging.
 *
 * CRITICAL: These codes MUST NOT change once deployed - they form the
 * foundation of audit trail consistency and compliance reporting.
 */
export const EventCodes = {
  /** User successfully authenticated with valid credentials */
  AUTH_LOGIN_SUCCEEDED: 'AUTH_LOGIN_SUCCEEDED',

  /** User authentication failed due to invalid credentials or other issues */
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',

  /** User session was explicitly revoked (logout, admin action, expiry) */
  AUTH_SESSION_REVOKED: 'AUTH_SESSION_REVOKED',

  /** Email verification token was successfully consumed */
  AUTH_VERIFY_CONSUMED: 'AUTH_VERIFY_CONSUMED',

  /** Password reset was requested and token generated */
  AUTH_RESET_REQUESTED: 'AUTH_RESET_REQUESTED',

  /** Password reset token was successfully consumed */
  AUTH_RESET_CONSUMED: 'AUTH_RESET_CONSUMED',

  /** Email resend was throttled due to rate limiting */
  AUTH_RESEND_THROTTLED: 'AUTH_RESEND_THROTTLED'
} as const;

/**
 * Type representing all valid event codes.
 * Used for type safety in logging operations.
 */
export type EventCode = typeof EventCodes[keyof typeof EventCodes];

/**
 * Validates that a string is a known event code.
 *
 * @param code - String to validate
 * @returns True if code is a valid EventCode
 */
export function isValidEventCode(code: string): code is EventCode {
  return Object.values(EventCodes).includes(code as EventCode);
}

/**
 * Gets all available event codes as an array.
 * Useful for validation and testing.
 *
 * @returns Array of all event code values
 */
export function getAllEventCodes(): EventCode[] {
  return Object.values(EventCodes);
}