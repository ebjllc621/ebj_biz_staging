/**
 * Admin Moderation Action API Routes
 * PATCH /api/admin/moderation/[type]/[id] - Moderate item (approve/reject)
 *
 * Each content type has different status columns and values.
 * This route handles the differences per type.
 *
 * Listings delegate to ListingApprovalService (full workflow + notifications).
 * Reviews/Events/Content do DB updates + trigger moderation notifications.
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.2
 * @reference src/core/services/ListingApprovalService.ts
 * @reference src/core/services/notification/ModerationNotificationService.ts
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getListingApprovalService } from '@core/services/ListingApprovalService';
import { getModerationNotificationService } from '@core/services/notification/ModerationNotificationService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

/**
 * Build the correct UPDATE query for non-listing content types.
 * Listings are handled by ListingApprovalService.
 */
function buildUpdateForType(
  type: string,
  id: number,
  action: 'approve' | 'reject',
  userId: string | null,
  reason: string | null,
  contentType?: string
): { query: string; params: unknown[] } {
  switch (type) {
    case 'reviews': {
      const status = action === 'approve' ? 'approved' : 'rejected';
      // Content review ratings have content_type like 'content_review_podcast'
      if (contentType && contentType.startsWith('content_review_')) {
        return {
          query: `UPDATE content_ratings SET status = ? WHERE id = ?`,
          params: [status, id]
        };
      }
      return {
        query: `UPDATE reviews
          SET status = ?, moderated_at = NOW(), moderated_by = ?, moderation_reason = ?
          WHERE id = ?`,
        params: [status, userId, reason, id]
      };
    }

    case 'events': {
      const status = action === 'approve' ? 'published' : 'cancelled';
      return {
        query: 'UPDATE events SET status = ? WHERE id = ?',
        params: [status, id]
      };
    }

    case 'content': {
      const status = action === 'approve' ? 'published' : 'archived';
      const tableMap: Record<string, string> = {
        article: 'content_articles',
        video: 'content_videos',
        podcast: 'content_podcasts'
      };
      const table = tableMap[contentType ?? ''];
      if (!table) {
        throw BizError.badRequest(`Invalid content type: ${contentType}`);
      }
      return {
        query: `UPDATE ${table} SET status = ? WHERE id = ?`,
        params: [status, id]
      };
    }

    default:
      throw BizError.badRequest('Invalid moderation type');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    const { userId } = context;

    if (!userId) {
      throw BizError.accessDenied('Admin authentication required');
    }

    const type = params.type;
    const id = parseInt(params.id);
    const body = await context.request.json();
    const { action, reason, contentType } = body;

    const validTypes = ['listings', 'reviews', 'events', 'content'];
    if (!validTypes.includes(type)) {
      throw BizError.badRequest('Invalid moderation type');
    }

    if (!['approve', 'reject'].includes(action)) {
      throw BizError.badRequest('Invalid action');
    }

    if (isNaN(id)) {
      throw BizError.badRequest('Invalid item ID');
    }

    const adminUserId = userId ? parseInt(userId) : 0;

    // =========================================================================
    // LISTINGS: Delegate to ListingApprovalService (handles notifications)
    // =========================================================================
    const adminActivityService = getAdminActivityService();

    if (type === 'listings') {
      const approvalService = getListingApprovalService();

      if (action === 'approve') {
        const result = await approvalService.approve({
          listingId: id,
          adminUserId,
          options: { adminNotes: reason || undefined }
        });

        // Log to admin_activity (non-blocking)
        adminActivityService.logModeration({
          adminUserId,
          targetEntityType: 'listing',
          targetEntityId: id,
          actionType: 'listing_approved',
          actionDescription: `Approved listing #${id}`,
          beforeData: { status: 'pending' },
          afterData: { status: 'active', userRoleUpdated: result.userRoleUpdated, adminNotes: reason || null },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          sessionId: request.cookies.get('bk_session')?.value,
          severity: 'normal'
        }).catch(() => {});

        return createSuccessResponse({
          success: true,
          userRoleUpdated: result.userRoleUpdated,
          notificationSent: result.notificationSent
        }, 200);
      } else {
        const result = await approvalService.reject({
          listingId: id,
          adminUserId,
          options: {
            reason: reason || 'No reason provided',
            adminNotes: undefined
          }
        });

        // Log to admin_activity (non-blocking)
        adminActivityService.logModeration({
          adminUserId,
          targetEntityType: 'listing',
          targetEntityId: id,
          actionType: 'listing_rejected',
          actionDescription: `Rejected listing #${id}${reason ? ': ' + reason : ''}`,
          beforeData: { status: 'pending' },
          afterData: { status: 'rejected', reason: reason || 'No reason provided' },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          sessionId: request.cookies.get('bk_session')?.value,
          severity: 'normal'
        }).catch(() => {});

        return createSuccessResponse({
          success: true,
          notificationSent: result.notificationSent
        }, 200);
      }
    }

    // =========================================================================
    // REVIEWS / EVENTS / CONTENT: DB update + moderation notification
    // =========================================================================
    const db = getDatabaseService();
    const { query, params: queryParams } = buildUpdateForType(
      type, id, action, userId || null, reason || null, contentType
    );

    await db.query(query, queryParams);

    // Log to admin_activity (non-blocking)
    const entityLabel = type === 'content' ? `${contentType || 'content'}` : type.replace(/s$/, '');
    adminActivityService.logModeration({
      adminUserId,
      targetEntityType: entityLabel,
      targetEntityId: id,
      actionType: `${entityLabel}_${action === 'approve' ? 'approved' : 'rejected'}`,
      actionDescription: `${action === 'approve' ? 'Approved' : 'Rejected'} ${entityLabel} #${id}${reason ? ': ' + reason : ''}`,
      beforeData: { status: 'pending' },
      afterData: { status: action === 'approve' ? 'approved' : 'rejected', reason: reason || null },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
      severity: 'normal'
    }).catch(() => {});

    // Send moderation notification (non-blocking, best-effort)
    const moderationNotification = getModerationNotificationService();

    if (type === 'reviews') {
      if (action === 'approve') {
        moderationNotification.notifyReviewApproved(id).catch(() => {});
      } else {
        moderationNotification.notifyReviewRejected(id, reason || null).catch(() => {});
      }
    } else if (type === 'events') {
      if (action === 'approve') {
        moderationNotification.notifyEventApproved(id).catch(() => {});
      } else {
        moderationNotification.notifyEventRejected(id, reason || null).catch(() => {});
      }
    } else if (type === 'content') {
      const validContentType = contentType as 'article' | 'video' | 'podcast';
      if (action === 'approve') {
        moderationNotification.notifyContentApproved(validContentType, id).catch(() => {});
      } else {
        moderationNotification.notifyContentRejected(validContentType, id, reason || null).catch(() => {});
      }
    }

    return createSuccessResponse({ success: true }, 200);
  })(request);
}
