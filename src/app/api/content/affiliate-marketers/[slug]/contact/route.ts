/**
 * Affiliate Marketer Contact Proposal API Route
 * POST /api/content/affiliate-marketers/[slug]/contact
 *
 * @authority Tier3_Phases/PHASE_5_CONTACT_PROPOSAL_SYSTEM.md
 * @tier STANDARD
 * @pattern Auth-required POST
 * @phase Tier 3 Creator Profiles - Phase 5
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService, AffiliateMarketerNotFoundError } from '@core/services/AffiliateMarketerService';
import { NotificationService } from '@core/services/NotificationService';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { ProposalType } from '@core/types/content-contact-proposal';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const POST = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const slug = params?.slug;

  if (!slug) {
    throw BizError.badRequest('Slug parameter is required');
  }

  // Parse and validate request body
  const body = await context.request.json();
  const { subject, message, proposal_type, budget_range, timeline, company_name } = body;

  if (!subject || typeof subject !== 'string' || subject.trim().length < 5 || subject.trim().length > 200) {
    return createErrorResponse(
      BizError.badRequest('Subject must be between 5 and 200 characters'),
      context.requestId
    );
  }

  if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
    return createErrorResponse(
      BizError.badRequest('Message must be between 10 and 2000 characters'),
      context.requestId
    );
  }

  const validProposalTypes: ProposalType[] = ['hire', 'collaborate', 'inquiry'];
  const resolvedProposalType: ProposalType =
    proposal_type && validProposalTypes.includes(proposal_type as ProposalType)
      ? (proposal_type as ProposalType)
      : 'hire';

  // Get authenticated user info
  const sessionUser = await getUserFromRequest(context.request);
  if (!sessionUser) {
    throw BizError.unauthorized('User session not found');
  }
  const senderUserId = sessionUser.id;
  const senderName = sessionUser.name || 'Unknown User';
  const senderEmail = sessionUser.email;

  // Initialize services
  const db = getDatabaseService();
  const marketerService = new AffiliateMarketerService(db);

  try {
    const { proposalId, profileOwnerId } = await marketerService.createContactProposal(
      slug,
      senderUserId,
      senderName,
      senderEmail,
      {
        subject: subject.trim(),
        message: message.trim(),
        proposal_type: resolvedProposalType,
        budget_range: budget_range?.trim() || undefined,
        timeline: timeline?.trim() || undefined,
        company_name: company_name?.trim() || undefined,
      }
    );

    // Fire-and-forget: Analytics tracking
    const analyticsService = new InternalAnalyticsService(db);
    analyticsService.trackConversion({
      conversionType: 'contact_proposal_sent',
      userId: senderUserId,
    }).catch(() => { /* fire-and-forget */ });

    // Fire-and-forget: Notification dispatch
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'content.contact_proposal_received',
      recipientId: profileOwnerId,
      title: 'New hiring proposal received',
      message: `${senderName} wants to hire you: "${subject.trim()}"`,
      entityType: 'content',
      entityId: proposalId,
      actionUrl: '/dashboard/proposals',
      priority: 'normal',
      triggeredBy: senderUserId,
      metadata: { proposal_id: proposalId, proposal_type: resolvedProposalType },
    }).catch(() => { /* fire-and-forget */ });

    return createSuccessResponse(
      { proposal_id: proposalId, message: 'Proposal sent successfully' },
      context.requestId
    );
  } catch (error) {
    if (error instanceof AffiliateMarketerNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
});
