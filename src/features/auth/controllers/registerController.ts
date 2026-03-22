/**
 * @deprecated TEMPORARY BRIDGE - Remove when AuthenticationService.register() is implemented
 * @timeline Phase 3 Email Service Integration will complete registration flow
 * @see docs/auth/newday2ndRemediation/03-email-service-integration.md
 *
 * IMPORTANT: This controller MUST return an ApiResponse object (not a Response),
 * so that apiHandler can properly wrap it and include cookies set via cookies().set().
 * Returning a manual Response bypasses cookie inclusion!
 */
import { ZodError } from "zod";
import { NextRequest } from 'next/server';
import { RegisterSchema } from "@/lib/validation/authSchemas";
import { setSessionCookie } from "@/core/utils/cookies";
import { buildIPContext } from '@/core/utils/pii';
import AuthServiceRegistry from "@/core/registry/AuthServiceRegistry";
import { BizError } from "@/core/errors/BizError";
import type { AuthService } from "@/features/auth/ports/AuthService";
import type { User } from "@/core/types/auth/contracts";

// Phase 5.5: Contact Becomes Member Notifications
import { getDatabaseService } from '@/core/services/DatabaseService';
import { NotificationService } from '@/core/services/NotificationService';
import { ContactMemberMatchService } from '@/features/contacts/services/ContactMemberMatchService';

// Referral Tracking: Connect platform invites to registrations
import { ReferralService } from '@/features/contacts/services/ReferralService';

export interface RegisterDeps {
  authService: AuthService;
  origin: string;
}

/**
 * Registration response type for apiHandler
 */
interface RegistrationApiResponse {
  success: boolean;
  data: {
    userId: number;
    email: string;
    username: string;
    isVerified: boolean;
    verificationEmailSent: boolean;
    user: User;
  };
}

export function makeRegisterController(deps: RegisterDeps) {
  return {
    /**
     * Handle POST request for user registration
     * Returns ApiResponse object (NOT Response) for proper cookie handling
     */
    async POST(req: Request): Promise<RegistrationApiResponse> {
      // Parse and validate input
      const payload = await req.json();
      const parseResult = RegisterSchema.safeParse(payload);

      if (!parseResult.success) {
        // Throw BizError for validation failures - apiHandler will handle it
        const firstError = parseResult.error.issues[0];
        throw BizError.validation(
          firstError?.path?.join('.') || 'input',
          payload,
          firstError?.message || 'Validation failed'
        );
      }

      const input = parseResult.data;

      // Build auth context for logging (Phase 7.4)
      const ipContext = await buildIPContext(req as NextRequest);
      const authContext = {
        hashedIP: ipContext.hashedIP,
        location: ipContext.location,
        userAgent: (req as NextRequest).headers.get('user-agent') || undefined,
        timestamp: new Date()
      };

      // Register the user
      const result = await deps.authService.registerUser(input, authContext);

      // Phase 5.5: Notify contact owners when their contact joins Bizconekt
      // Fire and forget - don't await, don't block registration
      const db = getDatabaseService();
      const notificationService = new NotificationService(db);
      const contactMatchService = new ContactMemberMatchService(db, notificationService);

      contactMatchService.notifyContactOwners(
        result.userId,
        result.email,
        null, // Phone not collected during registration
        input.name || result.username
      ).catch(error => {
        console.error('[Registration] Contact notification failed:', error);
      });

      // Referral Tracking: If user registered via referral link, track it
      // Fire and forget - don't await, don't block registration
      if (input.referralCode) {
        const referralService = new ReferralService(db);

        referralService.recordRegistration(input.referralCode, result.userId)
          .then(async (referral) => {
            if (referral) {
              // Notify the referrer that their referral registered
              try {
                // Get registrant name for notification
                const registrantName = input.name || result.username;

                await notificationService.dispatch({
                  type: 'referral.registered',
                  recipientId: referral.referrer_user_id,
                  title: `${registrantName} joined Bizconekt!`,
                  message: `Your referral just signed up. You earned ${25} points!`,
                  entityType: 'user',
                  entityId: result.userId,
                  actionUrl: `/profile/${result.userId}?action=connect`,
                  priority: 'normal',
                  metadata: {
                    referral_id: referral.id,
                    referral_code: input.referralCode,
                    new_user_id: result.userId,
                    points_earned: 25
                  }
                });
              } catch (notifyError) {
                console.error('[Registration] Referrer notification failed:', notifyError);
              }
            }
          })
          .catch(error => {
            console.error('[Registration] Referral tracking failed:', error);
          });
      }

      // Create session for auto-login after registration
      // Use SessionService.createSession() - same pattern as login flow
      const sessionService = AuthServiceRegistry.sessionService;
      const sessionToken = await sessionService.createSession(
        result.userId.toString(),
        {} // No context needed for registration (UA/IP hashing optional)
      );

      // Set httpOnly session cookie (24 hours)
      // IMPORTANT: This works because we return ApiResponse, not Response
      const maxAge = 24 * 60 * 60; // 24 hours in seconds
      setSessionCookie(sessionToken, maxAge);

      // Construct User object for response
      const user: User = {
        id: result.userId.toString(),
        email: result.email,
        name: input.name,
        username: result.username,
        role: 'general',
        isVerified: result.isVerified,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Return ApiResponse format (apiHandler will wrap this properly)
      return {
        success: true,
        data: {
          ...result,
          user // Include user object for AuthContext
        }
      };
    }
  };
}