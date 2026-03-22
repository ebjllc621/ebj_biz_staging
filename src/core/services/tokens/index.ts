/**
 * Token Services Module
 * Secure token generation and verification for email workflows
 *
 * @governance Service Architecture v2.0 compliance
 * @compliance E2.5 - Service Location Migration
 * @migrated-from src/services/tokens/
 */

// Core service and configuration
export { EmailTokenService } from './email-token-service';
export type { EmailTokenServiceConfig } from './email-token-service';

// Repository implementations
export { TokenRepoImpl, getTokenRepo } from './TokenRepoImpl';

// Types and interfaces
export type {
  TokenPurpose,
  TokenRecord,
  CreateTokenOptions,
  CreateTokenResult,
  VerifyConsumeResult,
  TokenRepo,
  EmailTokenService as EmailTokenServiceInterface
} from './types';

// Utility functions (for advanced usage)
export {
  base64urlEncode,
  base64urlDecode,
  sha256,
  genRawToken
} from './token-utils';