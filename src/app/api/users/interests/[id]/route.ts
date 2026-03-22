/**
 * User Interest by ID API Routes
 * PUT /api/users/interests/[id] - Update a group or membership interest
 * DELETE /api/users/interests/[id] - Remove an interest (any type)
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3C_BRAIN_PLAN.md
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserInterestsService } from '@features/profile/services/UserInterestsService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { GroupInterest, MembershipInterest } from '@features/profile/types/user-interests';

/**
 * PUT /api/users/interests/[id]
 * Update a group or membership interest
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withCsrf(apiHandler<{
    interest: GroupInterest | MembershipInterest;
    interest_type: string;
  }>(async (context: ApiContext) => {
    const userId = context.userId;
    if (!userId) {
      throw BizError.unauthorized('Authentication required');
    }

    const interestId = parseInt(params.id, 10);
    if (isNaN(interestId)) {
      throw BizError.validation('id', params.id, 'Valid interest ID is required');
    }

    const body = await context.request.json();
    const service = getUserInterestsService();

    // Determine update type based on body fields
    if (body.group_name !== undefined || body.group_purpose !== undefined || body.group_role !== undefined) {
      const interest = await service.updateGroup(parseInt(userId), interestId, {
        group_name: body.group_name,
        group_purpose: body.group_purpose,
        group_role: body.group_role
      });

      return createSuccessResponse(
        { interest, interest_type: 'group' },
        context.requestId
      );
    } else if (body.membership_name !== undefined || body.membership_description !== undefined) {
      const interest = await service.updateMembership(parseInt(userId), interestId, {
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
 * DELETE /api/users/interests/[id]
 * Remove a user interest (supports all types: category, custom, group, membership)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const userId = context.userId;
    if (!userId) {
      throw BizError.unauthorized('Authentication required');
    }

    const interestId = parseInt(params.id);

    if (isNaN(interestId)) {
      throw BizError.validation('id', params.id, 'Valid interest ID is required');
    }

    const service = getUserInterestsService();

    // Try removing as custom, category, group, or membership interest
    // The service methods will throw if the interest doesn't exist or doesn't belong to the user
    try {
      await service.removeCustomInterest(parseInt(userId), interestId);
      return createSuccessResponse(
        { message: 'Custom interest removed successfully' },
        context.requestId
      );
    } catch {
      try {
        await service.removeCategoryInterest(parseInt(userId), interestId);
        return createSuccessResponse(
          { message: 'Category interest removed successfully' },
          context.requestId
        );
      } catch {
        try {
          await service.removeGroup(parseInt(userId), interestId);
          return createSuccessResponse(
            { message: 'Group removed successfully' },
            context.requestId
          );
        } catch {
          try {
            await service.removeMembership(parseInt(userId), interestId);
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
