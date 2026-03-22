/**
 * Username-Based User Interests API Routes
 * GET /api/users/[username]/interests - Get a user's interests (PUBLIC - anyone can view)
 * POST /api/users/[username]/interests - Add an interest to a specific user (owner or admin only)
 *
 * @authority docs/pages/layouts/userProfile/phases/fixes/2-7-26/FIXLIST_ADMIN_EDIT_MODAL_BUG.md
 * @purpose Fix admin edit modal bug where interests load from/save to admin's profile instead of target user
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserInterestsService } from '@features/profile/services/UserInterestsService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { CategoryInterest, CustomInterest, GroupInterest, MembershipInterest } from '@features/profile/types/user-interests';

/**
 * Helper: Get target user by username (for public read access)
 * No permission check - interests are public profile data
 */
async function getTargetUserByUsername(username: string): Promise<number> {
  const db = getDatabaseService();

  const targetResult = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  const targetUser = targetResult.rows[0];
  if (!targetUser) {
    throw BizError.notFound('User not found');
  }

  return targetUser.id;
}

/**
 * Helper: Get target user by username and verify permission (for write operations)
 * Returns the target user ID if the current user has permission to modify
 */
async function getTargetUserWithPermission(
  username: string,
  context: ApiContext
): Promise<{ targetUserId: number; isAdmin: boolean }> {
  const db = getDatabaseService();

  // Get target user by username
  const targetResult = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  const targetUser = targetResult.rows[0];
  if (!targetUser) {
    throw BizError.notFound('User not found');
  }

  // Check permission: owner or admin can modify
  const isOwner = context.userId === String(targetUser.id);

  // Check if current user is admin by querying their role
  let isAdmin = false;
  if (context.userId) {
    const currentUserResult = await db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = ? LIMIT 1',
      [context.userId]
    );
    isAdmin = currentUserResult.rows[0]?.role === 'admin';
  }

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to modify this user\'s interests');
  }

  return { targetUserId: targetUser.id, isAdmin };
}

/**
 * GET /api/users/[username]/interests
 * Get a user's interests - PUBLIC endpoint (anyone can view profile interests)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  return apiHandler(async (context: ApiContext) => {
    const { username } = await params;
    // Use public helper - no auth required to view interests
    const targetUserId = await getTargetUserByUsername(username);

    const service = getUserInterestsService();
    const { category, custom, groups, memberships } = await service.getAllInterests(targetUserId);

    return createSuccessResponse(
      {
        interests: category,             // Backward compatible
        category_interests: category,
        custom_interests: custom,
        groups: groups,
        memberships: memberships,
        total_count: category.length + custom.length + groups.length + memberships.length
      },
      context.requestId
    );
  }, {
    requireAuth: false,  // PUBLIC - interests are viewable by anyone
    allowedMethods: ['GET', 'POST']
  })(request);
}

/**
 * POST /api/users/[username]/interests
 * Add a category, custom, group, or membership interest to target user (owner or admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  return withCsrf(apiHandler<{
    interest: CategoryInterest | CustomInterest | GroupInterest | MembershipInterest;
    interest_type: string;
  }>(async (context: ApiContext) => {
    const { username } = await params;
    const { targetUserId } = await getTargetUserWithPermission(username, context);

    const body = await context.request.json();
    const service = getUserInterestsService();

    // Determine interest type based on request body (same logic as existing route)
    if (body.category_id !== undefined) {
      // Category interest
      if (typeof body.category_id !== 'number') {
        throw BizError.validation('category_id', body.category_id, 'Valid category_id is required');
      }

      const interest = await service.addCategoryInterest(targetUserId, {
        category_id: body.category_id,
        display_order: body.display_order
      });

      return createSuccessResponse(
        { interest, interest_type: 'category' },
        context.requestId
      );
    } else if (body.custom_value !== undefined) {
      // Custom interest
      if (typeof body.custom_value !== 'string' || !body.custom_value.trim()) {
        throw BizError.validation('custom_value', body.custom_value, 'Custom interest value is required');
      }

      const interest = await service.addCustomInterest(targetUserId, {
        custom_value: body.custom_value,
        display_order: body.display_order
      });

      return createSuccessResponse(
        { interest, interest_type: 'custom' },
        context.requestId
      );
    } else if (body.group_name !== undefined) {
      // Group interest
      if (typeof body.group_name !== 'string' || !body.group_name.trim()) {
        throw BizError.validation('group_name', body.group_name, 'Group name is required');
      }

      const interest = await service.addGroup(targetUserId, {
        group_name: body.group_name,
        group_purpose: body.group_purpose,
        group_role: body.group_role,
        display_order: body.display_order
      });

      return createSuccessResponse(
        { interest, interest_type: 'group' },
        context.requestId
      );
    } else if (body.membership_name !== undefined) {
      // Membership interest
      if (typeof body.membership_name !== 'string' || !body.membership_name.trim()) {
        throw BizError.validation('membership_name', body.membership_name, 'Membership name is required');
      }

      const interest = await service.addMembership(targetUserId, {
        membership_name: body.membership_name,
        membership_description: body.membership_description,
        display_order: body.display_order
      });

      return createSuccessResponse(
        { interest, interest_type: 'membership' },
        context.requestId
      );
    } else {
      throw BizError.badRequest('One of category_id, custom_value, group_name, or membership_name is required');
    }
  }, {
    requireAuth: true,
    allowedMethods: ['GET', 'POST']
  }))(request);
}
