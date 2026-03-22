/**
 * Admin Newsletter Action API Route
 * PATCH /api/admin/newsletters/[id] — Update newsletter status/featured
 * DELETE /api/admin/newsletters/[id] — Delete newsletter with activity log
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for state-changing operations (PATCH, DELETE)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - AdminActivityService logging on all admin actions
 * - NewsletterService instantiated directly (not in ServiceRegistry)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase N6
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';
import { NewsletterStatus } from '@core/types/newsletter';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

function extractNewsletterIdFromUrl(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/admin/newsletters/[id]
  const newslettersIndex = segments.indexOf('newsletters');
  const rawId = segments[newslettersIndex + 1] ?? '';
  const id = parseInt(rawId, 10);

  if (isNaN(id) || id <= 0) {
    throw BizError.badRequest('Invalid newsletter ID');
  }

  return id;
}

// ============================================================================
// GET — Fetch individual newsletter for editing
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('read admin newsletter', 'admin');
  }

  const url = new URL(request.url);
  const newsletterId = extractNewsletterIdFromUrl(url);

  const newsletterService = new NewsletterService(getDatabaseService());
  const newsletter = await newsletterService.getNewsletterById(newsletterId);

  if (!newsletter) {
    throw BizError.notFound('Newsletter', newsletterId);
  }

  return createSuccessResponse({ newsletter });
});

// ============================================================================
// PATCH — Update newsletter status or featured flag
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('update admin newsletter', 'admin');
  }

  const url = new URL(request.url);
  const newsletterId = extractNewsletterIdFromUrl(url);

  const body = await request.json() as {
    status?: string;
    is_featured?: boolean;
  };

  // Validate status if provided
  const validStatuses = Object.values(NewsletterStatus) as string[];
  if (body.status && !validStatuses.includes(body.status)) {
    throw BizError.badRequest(`Invalid newsletter status: ${body.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  const newsletterService = new NewsletterService(getDatabaseService());
  const adminActivityService = getAdminActivityService();

  const updates: { status?: NewsletterStatus; is_featured?: boolean } = {};
  if (body.status) updates.status = body.status as NewsletterStatus;
  if (typeof body.is_featured === 'boolean') updates.is_featured = body.is_featured;

  const updated = await newsletterService.updateNewsletter(newsletterId, updates);

  // Log admin activity
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'newsletter',
    targetEntityId: newsletterId,
    actionType: 'newsletter_status_update',
    actionCategory: 'moderation',
    actionDescription: `Admin updated newsletter #${newsletterId}`,
    afterData: body as Record<string, unknown>,
    severity: 'normal',
  });

  return createSuccessResponse({ newsletter: updated, message: 'Newsletter updated successfully' });
}));

// ============================================================================
// DELETE — Delete newsletter with activity log
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('delete admin newsletter', 'admin');
  }

  const url = new URL(request.url);
  const newsletterId = extractNewsletterIdFromUrl(url);

  const newsletterService = new NewsletterService(getDatabaseService());
  const adminActivityService = getAdminActivityService();

  // Capture before data for audit
  const before = await newsletterService.getNewsletterById(newsletterId);
  if (!before) {
    throw BizError.notFound('Newsletter', newsletterId);
  }

  await newsletterService.deleteNewsletter(newsletterId);

  // Log admin activity
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'newsletter',
    targetEntityId: newsletterId,
    actionType: 'newsletter_delete',
    actionCategory: 'deletion',
    actionDescription: `Admin deleted newsletter #${newsletterId}: "${before.title}"`,
    beforeData: before as unknown as Record<string, unknown>,
    severity: 'high',
  });

  return createSuccessResponse({ message: 'Newsletter deleted successfully' });
}));
