/**
 * POST /api/auth/register
 * User registration endpoint
 *
 * @governance httpOnly cookies ONLY for authentication
 * @governance PII protection - Hash all IP addresses (Build Map v2.1)
 * @authority mandatory-verification-protocol.mdc - Cookie Policy
 * @pattern AuthServiceRegistry singleton (NO direct instantiation)
 * @refactored Phase 3A - API Route Standardization v2.0
 *
 * NOTE: Registration uses controller pattern until register() method added to AuthenticationService
 */

import { makeRegisterController } from '@/features/auth/controllers/registerController';
import { withCsrf } from '@/lib/security/withCsrf';
import { apiHandler, ApiContext } from '@/core/api/apiHandler';
import AuthServiceRegistry from '@/core/registry/AuthServiceRegistry';
import { jsonMethodNotAllowed } from '@/lib/http/json';

export const runtime = 'nodejs';

/**
 * Register handler implementation
 * Uses AuthServiceRegistry singleton via controller
 */
async function registerHandler(context: ApiContext) {
  const { request } = context;

  // ✅ CORRECT - Uses AuthServiceRegistry singleton with async initialization
  // Waits for initialization to complete before accessing service
  const authService = await AuthServiceRegistry.getAuthService();

  const controller = makeRegisterController({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type bridge: AuthenticationService → AuthService interface (temporary until controller migration)
    authService: authService as any,
    origin: process.env.APP_ORIGIN || request.headers.get('origin') || 'http://localhost:3000'
  });

  return controller.POST(request);
}

export const POST = withCsrf(apiHandler(registerHandler, {
  allowedMethods: ['POST'],
  requireAuth: false
}));

// Method guards - only POST allowed for register
const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}