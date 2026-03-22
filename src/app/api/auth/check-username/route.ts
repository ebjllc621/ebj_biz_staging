/**
 * Username Availability Check API
 * GET /api/auth/check-username?username=x - Check username availability
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: NOT required (public endpoint for registration)
 * - Rate limiting: Implicit via apiHandler (prevents enumeration attacks)
 * - Read-only operation (no CSRF required)
 *
 * SECURITY NOTES:
 * - Does not reveal email addresses or other user info
 * - Only returns availability status
 * - Rate limited to prevent username enumeration
 *
 * @authority .cursor/rules/api-response-standards.mdc
 * @phase Registration Modal Fix - 2026-01-31
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(
  async (context: ApiContext) => {
    const { request } = context;

    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username?.trim()) {
      throw BizError.validation('username', username, 'Username is required');
    }

    // Validate username format before checking DB
    const normalizedUsername = username.toLowerCase().trim();

    if (normalizedUsername.length < 3) {
      throw BizError.validation('username', username, 'Username must be at least 3 characters');
    }

    if (normalizedUsername.length > 30) {
      throw BizError.validation('username', username, 'Username must be 30 characters or less');
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(normalizedUsername)) {
      throw BizError.validation('username', username, 'Username can only contain letters, numbers, and underscores');
    }

    const db = getDatabaseService();

    // Check if username exists
    const existing = await db.query<{ id: number }>(
      'SELECT id FROM users WHERE username = ?',
      [normalizedUsername]
    );

    return createSuccessResponse({
      username: normalizedUsername,
      available: existing.rows.length === 0
    });
  },
  {
    allowedMethods: ['GET'],
    requireAuth: false  // Public endpoint for registration flow
  }
);
