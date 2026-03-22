/**
 * Profile Layout API Route
 * GET /api/users/profile/layout - Get user's layout
 * PUT /api/users/profile/layout - Update user's layout or reset to default
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - CSRF protection: Required for PUT requests
 * - Authentication: Required via httpOnly cookies
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_6_BRAIN_PLAN.md
 * @tier ENTERPRISE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/app/api/users/profile/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ProfileLayout, DEFAULT_PROFILE_LAYOUT, mergeWithDefaultLayout } from '@features/profile/types/profile-layout';

interface LayoutRow {
  profile_layout: string | ProfileLayout | null;
}

/**
 * GET /api/users/profile/layout
 * Get the authenticated user's profile layout preferences
 *
 * @authenticated Requires valid session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);

  const db = getDatabaseService();
  const result = await db.query<LayoutRow>(
    'SELECT profile_layout FROM users WHERE id = ?',
    [userId]
  );

  if (result.rows.length === 0) {
    return createSuccessResponse({ layout: DEFAULT_PROFILE_LAYOUT }, context.requestId);
  }

  const row = result.rows[0];
  const layout = typeof row?.profile_layout === 'string'
    ? JSON.parse(row.profile_layout)
    : row?.profile_layout;

  return createSuccessResponse({
    layout: mergeWithDefaultLayout(layout)
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

/**
 * PUT /api/users/profile/layout
 * Update the authenticated user's profile layout or reset to default
 *
 * @authenticated Requires valid session
 * @csrf Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const userId = parseInt(context.userId, 10);

  const body = await context.request.json() as { layout?: ProfileLayout; reset?: boolean };

  const db = getDatabaseService();

  let updatedLayout: ProfileLayout;

  if (body.reset) {
    // Reset to default
    updatedLayout = {
      ...DEFAULT_PROFILE_LAYOUT,
      updatedAt: new Date().toISOString()
    };
  } else if (body.layout) {
    // Update with provided layout
    updatedLayout = {
      ...body.layout,
      updatedAt: new Date().toISOString()
    };
  } else {
    throw BizError.badRequest('Layout or reset flag required');
  }

  await db.query(
    'UPDATE users SET profile_layout = ? WHERE id = ?',
    [JSON.stringify(updatedLayout), userId]
  );

  return createSuccessResponse({
    layout: updatedLayout,
    message: body.reset ? 'Layout reset to default' : 'Layout updated successfully'
  }, context.requestId);
}, {
  allowedMethods: ['PUT'],
  requireAuth: true
});
