/**
 * Contact Import Notification API Route
 * POST /api/contacts/import/notify - Send notifications for matched contacts
 *
 * Phase 5: Contact-to-User Matching Integration
 * Sends opt-in notifications when imported contacts match Bizconekt members
 *
 * @tier SIMPLE
 * @authority CLAUDE.md - Contact Import Matching Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { NotificationService } from '@core/services/NotificationService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { ImportMatchResult } from '@features/contacts/types';

/**
 * POST /api/contacts/import/notify
 * Send notifications for matched contacts (user opt-in)
 *
 * @authenticated Required
 * @body { matches: ImportMatchResult[] }
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const notificationService = new NotificationService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate request
  if (!body.matches || !Array.isArray(body.matches)) {
    return createErrorResponse(
      new BizError({ code: 'VALIDATION_ERROR', message: 'matches array is required' }),
      context.requestId
    );
  }

  const matches: ImportMatchResult[] = body.matches;

  if (matches.length === 0) {
    return createSuccessResponse({ notified: 0 }, context.requestId);
  }

  // Limit to prevent abuse
  if (matches.length > 50) {
    return createErrorResponse(
      new BizError({ code: 'TOO_MANY_MATCHES', message: 'Maximum 50 notifications per request' }),
      context.requestId
    );
  }

  let notified = 0;
  const errors: Array<{ contactId: number; error: string }> = [];

  // Send notification for each match
  for (const match of matches) {
    try {
      // Skip already connected or pending
      if (match.isAlreadyConnected || match.hasPendingRequest) {
        continue;
      }

      await notificationService.dispatch({
        type: 'contact.became_member',
        recipientId: userId,
        title: `${match.contactName} is on Bizconekt!`,
        message: `Your imported contact "${match.contactName}" matches a Bizconekt member. Connect with them now!`,
        entityType: 'user',
        entityId: match.matchedUserId,
        actionUrl: `/profile/${match.matchedUser.username}?action=connect`,
        priority: 'normal',
        metadata: {
          contactId: match.contactId,
          matchType: match.matchType,
          confidence: match.confidence,
          source: 'import'
        }
      });

      notified++;
    } catch (error) {
      errors.push({
        contactId: match.contactId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return createSuccessResponse({
    notified,
    skipped: matches.length - notified - errors.length,
    errors: errors.length > 0 ? errors : undefined
  }, context.requestId);
}, {
  requireAuth: true
});
