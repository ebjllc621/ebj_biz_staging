/**
 * Authentication Services Exports
 *
 * Centralized exports for AUTH-P2-2E authentication implementation
 * with session rotation core and integrated rate limiting functionality.
 */

import { SessionService } from './SessionService';
import { AuthenticationService } from './AuthenticationService';
import { MfaService } from './MfaService';
import { hashIPAddress } from '@/core/utils/pii';

// Core AuthenticationService implementation
export { AuthenticationService } from './AuthenticationService';

// SessionService implementation (AUTH-P2-2E)
export { SessionService } from './SessionService';

// MfaService implementation (AUTH-P3A-TOTP)
export { MfaService } from './MfaService';

// Interfaces and types
export type {
  AuthResult,
  AuthContext,
  AuthenticationServiceConfig
} from './AuthenticationService';

export type {
  SessionData,
  SessionContext,
  SessionValidationResult,
  SessionRotationResult,
  SessionServiceConfig
} from './SessionService';

export type {
  MfaServiceConfig
} from './MfaService';

// Re-export auth contracts from canonical location
export type {
  LoginRequest,
  LoginResponse,
  User,
  AuthSession,
  ValidateResponse,
  LogoutResponse,
  UserRole,
  AuthErrorCode
} from '@/core/types/auth/contracts';

export {
  AUTH_ERROR_CODES
} from '@/core/types/auth/contracts';

// Service factory for creating configured authentication service
export interface AuthServiceDependencies {
  database: import('../DatabaseService').DatabaseService;
  rateLimiter: import('../rate').IRateLimiter;
}

/**
 * Create session service with default configuration (AUTH-P2-2E)
 * @internal - Use AuthServiceRegistry instead
 */
function _createSessionService(
  database: import('../DatabaseService').DatabaseService,
  config?: Partial<import('./SessionService').SessionServiceConfig>
): SessionService {
  return new SessionService({
    name: 'SessionService',
    version: '2.0.0-AUTH-P2-2E',
    database,
    sessionExpiryHours: 24,
    enableRotationChaining: true,
    ...config
  });
}

/**
 * Create authentication service with default configuration (AUTH-P2-2E)
 * @internal - Use AuthServiceRegistry instead
 */
function _createAuthenticationService(
  dependencies: AuthServiceDependencies,
  sessionService: SessionService,
  config?: Partial<import('./AuthenticationService').AuthenticationServiceConfig>
): AuthenticationService {
  return new AuthenticationService({
    name: 'AuthenticationService',
    version: '2.0.0-AUTH-P2-2E',
    database: dependencies.database,
    rateLimiter: dependencies.rateLimiter,
    sessionService,
    sessionExpiryHours: 24,
    enforceRateLimit: true,
    ...config
  });
}

/**
 * Create MFA service with default configuration (AUTH-P3A-TOTP)
 * @internal - Use AuthServiceRegistry instead
 */
function _createMfaService(
  database: import('../DatabaseService').DatabaseService,
  authSecret: string
): import('./MfaService').MfaService {
  return new (require('./MfaService').MfaService)({
    database,
    authSecret
  });
}

// Default authentication configuration
export const DEFAULT_AUTH_CONFIG = {
  sessionExpiryHours: 24,
  enforceRateLimit: true,
  passwordMinLength: 8,
  requireEmailVerification: false
} as const;

// HTTP status codes for authentication responses
export const AUTH_HTTP_STATUS = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
  LOCKED: 423
} as const;

/**
 * Authentication middleware helpers
 */
export class AuthMiddleware {
  /**
   * Extract IP address from request headers
   */
  static extractIPAddress(headers: Record<string, string | string[] | undefined>): string {
    // Check for forwarded IP first (proxy/load balancer)
    const forwarded = headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      if (ip && typeof ip === 'string') {
        const firstIp = ip.split(',')[0];
        if (firstIp) {
          return firstIp.trim();
        }
      }
    }

    // Check for real IP header
    const realIp = headers['x-real-ip'];
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip) {
        return ip;
      }
    }

    // Fallback to remote address
    return (headers['x-remote-addr'] as string) || '127.0.0.1';
  }

  /**
   * Create auth context from request
   */
  static createAuthContext(headers: Record<string, string | string[] | undefined>): import('./AuthenticationService').AuthContext {
    const ip = AuthMiddleware.extractIPAddress(headers);
    return {
      ipAddress: ip || '',
      userAgent: (headers['user-agent'] as string) || '',
      hashedIP: ip ? hashIPAddress(ip) : '',
      timestamp: new Date()
    };
  }

  /**
   * Create HTTP response for authentication result
   */
  static createAuthResponse(result: import('./AuthenticationService').AuthResult): {
    status: number;
    headers: Record<string, string>;
    body: any;
  } {
    const status = result.success
      ? AUTH_HTTP_STATUS.SUCCESS
      : result.error?.code === 'ACCOUNT_LOCKED'
      ? AUTH_HTTP_STATUS.LOCKED
      : result.error?.code === 'TOO_MANY_REQUESTS'
      ? AUTH_HTTP_STATUS.TOO_MANY_REQUESTS
      : AUTH_HTTP_STATUS.UNAUTHORIZED;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add rate limiting headers if present
    if (result.rateLimit?.headers) {
      Object.assign(headers, result.rateLimit.headers);
    }

    const body = result.success
      ? {
          success: true,
          user: result.user,
          session: result.session
        }
      : {
          success: false,
          error: result.error
        };

    return { status, headers, body };
  }
}