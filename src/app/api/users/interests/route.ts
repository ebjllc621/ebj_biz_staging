/**
 * User Interests API Routes
 * GET /api/users/interests - Get current user's interests (all types)
 * POST /api/users/interests - Add a category, custom, group, or membership interest
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3C_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserInterestsService } from '@features/profile/services/UserInterestsService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import type { CategoryInterest, CustomInterest, GroupInterest, MembershipInterest } from '@features/profile/types/user-interests';

/**
 * GET /api/users/interests
 * Get current user's interests (all 4 types: category, custom, groups, memberships)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const service = getUserInterestsService();
  const { category, custom, groups, memberships } = await service.getAllInterests(parseInt(userId));

  return createSuccessResponse(
    {
      interests: category,             // Backward compatible
      category_interests: category,
      custom_interests: custom,
      groups: groups,                  // Phase 3C
      memberships: memberships,        // Phase 3C
      total_count: category.length + custom.length + groups.length + memberships.length
    },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/users/interests
 * Add a category, custom, group, or membership interest
 * Body: { category_id: number } OR { custom_value: string } OR { group_name: string } OR { membership_name: string }
 */
export const POST = withCsrf(apiHandler<{
  interest: CategoryInterest | CustomInterest | GroupInterest | MembershipInterest;
  interest_type: string;
}>(async (context: ApiContext) => {
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const body = await context.request.json();
  const service = getUserInterestsService();

  // Determine interest type based on request body
  if (body.category_id !== undefined) {
    // Category interest (Phase 3A)
    if (typeof body.category_id !== 'number') {
      throw BizError.validation('category_id', body.category_id, 'Valid category_id is required');
    }

    const interest = await service.addCategoryInterest(parseInt(userId), {
      category_id: body.category_id,
      display_order: body.display_order
    });

    return createSuccessResponse(
      { interest, interest_type: 'category' },
      context.requestId
    );
  } else if (body.custom_value !== undefined) {
    // Custom interest (Phase 3B)
    if (typeof body.custom_value !== 'string' || !body.custom_value.trim()) {
      throw BizError.validation('custom_value', body.custom_value, 'Custom interest value is required');
    }

    const interest = await service.addCustomInterest(parseInt(userId), {
      custom_value: body.custom_value,
      display_order: body.display_order
    });

    return createSuccessResponse(
      { interest, interest_type: 'custom' },
      context.requestId
    );
  } else if (body.group_name !== undefined) {
    // Group interest (Phase 3C)
    if (typeof body.group_name !== 'string' || !body.group_name.trim()) {
      throw BizError.validation('group_name', body.group_name, 'Group name is required');
    }

    const interest = await service.addGroup(parseInt(userId), {
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
    // Membership interest (Phase 3C)
    if (typeof body.membership_name !== 'string' || !body.membership_name.trim()) {
      throw BizError.validation('membership_name', body.membership_name, 'Membership name is required');
    }

    const interest = await service.addMembership(parseInt(userId), {
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
}));
