/**
 * Team Member API Routes - PUT/DELETE /api/listings/[id]/team/[memberId]
 *
 * @authority Phase 8 Brain Plan - Team Manager API
 * @governance 100% authentication gating (listing_member, admin)
 * @governance Ownership verification required
 * @pattern Exact replication of /api/events/[id] pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getTeamMemberService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * PUT /api/listings/[id]/team/[memberId] - Update team member
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  // Account type check - listing_member or admin only
  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('update team members', 'team'),
      context.requestId
    );
  }

  // Extract IDs from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const listingIdStr = segments[segments.indexOf('listings') + 1];
  const memberIdStr = segments[segments.length - 1];

  if (!listingIdStr || !memberIdStr) {
    throw BizError.badRequest('Listing ID and Member ID are required', {});
  }

  const listingId = parseInt(listingIdStr);
  const memberId = parseInt(memberIdStr);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdStr });
  }

  if (isNaN(memberId)) {
    throw BizError.badRequest('Invalid member ID', { memberId: memberIdStr });
  }

  const body = await request.json();

  const teamMemberService = getTeamMemberService();
  const listingService = getListingService();

  try {
    // Verify listing ownership
    const listing = await listingService.getById(listingId);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('update team members for this listing', 'listing'),
        context.requestId
      );
    }

    // Verify member belongs to this listing
    const member = await teamMemberService.getById(memberId);
    if (!member || member.listing_id !== listingId) {
      return createErrorResponse(
        BizError.notFound('Team member', memberId),
        context.requestId
      );
    }

    // Update team member
    const updated = await teamMemberService.update(memberId, {
      name: body.name,
      role: body.role,
      bio: body.bio,
      photo_url: body.photo_url,
      email: body.email,
      phone: body.phone,
      social_links: body.social_links,
      display_order: body.display_order,
      is_visible: body.is_visible
    });

    return createSuccessResponse(
      { member: updated, message: 'Team member updated successfully' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('TeamMemberService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}, {
  allowedMethods: ['PUT', 'DELETE']
}));

/**
 * DELETE /api/listings/[id]/team/[memberId] - Delete team member
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  // Account type check - listing_member or admin only
  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('delete team members', 'team'),
      context.requestId
    );
  }

  // Extract IDs from URL
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const listingIdStr = segments[segments.indexOf('listings') + 1];
  const memberIdStr = segments[segments.length - 1];

  if (!listingIdStr || !memberIdStr) {
    throw BizError.badRequest('Listing ID and Member ID are required', {});
  }

  const listingId = parseInt(listingIdStr);
  const memberId = parseInt(memberIdStr);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdStr });
  }

  if (isNaN(memberId)) {
    throw BizError.badRequest('Invalid member ID', { memberId: memberIdStr });
  }

  const teamMemberService = getTeamMemberService();
  const listingService = getListingService();

  try {
    // Verify listing ownership
    const listing = await listingService.getById(listingId);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('delete team members for this listing', 'listing'),
        context.requestId
      );
    }

    // Verify member belongs to this listing
    const member = await teamMemberService.getById(memberId);
    if (!member || member.listing_id !== listingId) {
      return createErrorResponse(
        BizError.notFound('Team member', memberId),
        context.requestId
      );
    }

    // Delete team member
    await teamMemberService.delete(memberId);

    return createSuccessResponse(
      { message: 'Team member deleted successfully' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('TeamMemberService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}, {
  allowedMethods: ['PUT', 'DELETE']
}));
