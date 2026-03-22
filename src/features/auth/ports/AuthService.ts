/**
 * @deprecated TEMPORARY - This interface supports legacy controllers
 *
 * This interface will be removed when:
 * 1. loginController.ts is deleted (after register() added to AuthenticationService)
 * 2. registerController.ts is deleted (after register() added to AuthenticationService)
 *
 * @timeline Remove in Phase 3 or later
 * @see docs/auth/newday2ndRemediation/03-email-service-integration.md
 */
import type { AuthContext } from '@/core/services/auth/AuthenticationService';

export interface AuthService {
  registerUser(input: { name: string; email: string; username?: string; password: string; confirmPassword: string }, context?: AuthContext): Promise<{ userId: number; email: string; username: string; isVerified: boolean; verificationEmailSent: boolean }>;
  loginUser(input: { email: string; password: string }): Promise<{ userId: number; isVerified: boolean }>;
  logout(csrf: string): Promise<void>;
  getSession(): Promise<{ userId: number; role: 'general' | 'listing_member' | 'admin'; isVerified: boolean; serverTime: string }>;
  verifyEmail(uid: number, token: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(uid: number, token: string, newPassword: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
}

// Stub implementations removed - they violated anti-synthetic-implementation-enforcement