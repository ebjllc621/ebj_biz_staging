/**
 * Username-Based User Interest by ID API Routes
 * PUT /api/users/[username]/interests/[id] - Update a group or membership interest for target user
 * DELETE /api/users/[username]/interests/[id] - Remove an interest from target user (any type)
 *
 * @authority docs/pages/layouts/userProfile/phases/fixes/2-7-26/FIXLIST_ADMIN_EDIT_MODAL_BUG.md
 * @purpose Fix admin edit modal bug where interests save to admin's profile instead of target user
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserInterestsService } from '@features/profile/services/UserInterestsService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { GroupInterest, MembershipInterest } from '@features/profile/types/user-interests';

/**
 * Helper: Get target user by username and verify permission
 */
async function getTargetUserWithPermission(
  username: string,
  context: ApiContext
): Promise<{ targetUserId: number; isAdmin: boolean }> {
  const db = getDatabaseService();

  const targetResult = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE username = ? LIMIT 1',
    [username]
  );

  const targetUser = targetResult.rows[0];
  if (!targetUser) {
    throw BizError.notFound('User not found');
  }

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
 * PUT /api/users/[username]/interests/[id]
 * Update a group or membership interest for target user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  return withCsrf(apiHandler<{
    interest: GroupInterest | MembershipInterest;
    interest_type: string;
  }>(async (context: ApiContext) => {
    const { username, id } = await params;
    const { targetUserId } = await getTargetUserWithPermission(username, context);

    const interestId = parseInt(id, 10);
    if (isNaN(interestId)) {
      throw BizError.validation('id', id, 'Valid interest ID is required');
    }

    const body = await context.request.json();
    const service = getUserInterestsService();

    // Determine update type based on body fields
    if (body.group_name !== undefined || body.group_purpose !== undefined || body.group_role !== undefined) {
      const interest = await service.updateGroup(targetUserId, interestId, {
        group_name: body.group_name,
        group_purpose: body.group_purpose,
        group_role: body.group_role
      });

      return createSuccessResponse(
        { interest, interest_type: 'group' },
        context.requestId
      );
    } else if (body.membership_name !== undefined || body.membership_description !== undefined) {
      const interest = await service.updateMembership(targetUserId, interestId, {
        membership_name: body.membership_name,
        membership_description: body.membership_description
      });

      return createSuccessResponse(
        { interest, interest_type: 'membership' },
        context.requestId
      );
    } else {
      throw BizError.badRequest('No valid update fields provided');
    }
  }, {
    requireAuth: true,
    allowedMethods: ['DELETE', 'PUT']
  }))(request);
}

/**
 * DELETE /api/users/[username]/interests/[id]
 * Remove a user interest from target user (supports all types: category, custom, group, membership)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; id: string }> }
) {
  return apiHandler(async (context: ApiContext) => {
    const { username, id } = await params;
    const { targetUserId } = await getTargetUserWithPermission(username, context);

    const interestId = parseInt(id, 10);
    if (isNaN(interestId)) {
      throw BizError.validation('id', id, 'Valid interest ID is required');
    }

    const service = getUserInterestsService();

    // Try removing as custom, category, group, or membership interest
    // The service methods will throw if the interest doesn't exist or doesn't belong to the user
    try {
      await service.removeCustomInterest(targetUserId, interestId);
      return createSuccessResponse(
        { message: 'Custom interest removed successfully' },
        context.requestId
      );
    } catch {
      try {
        await service.removeCategoryInterest(targetUserId, interestId);
        return createSuccessResponse(
          { message: 'Category interest removed successfully' },
          context.requestId
        );
      } catch {
        try {
          await service.removeGroup(targetUserId, interestId);
          return createSuccessResponse(
            { message: 'Group removed successfully' },
            context.requestId
          );
        } catch {
          try {
            await service.removeMembership(targetUserId, interestId);
            return createSuccessResponse(
              { message: 'Membership removed successfully' },
              context.requestId
            );
          } catch {
            // None of the types matched - throw not found
            throw BizError.notFound('Interest not found');
          }
        }
      }
    }
  }, {
    requireAuth: true,
    allowedMethods: ['DELETE', 'PUT']
  })(request);
}
