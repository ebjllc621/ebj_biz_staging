/**
 * Admin Guide Action API Route
 * GET /api/admin/guides/[id] — Guide detail with sections (for preview modal)
 * PATCH /api/admin/guides/[id] — Update guide status/featured, fire publish notification
 * DELETE /api/admin/guides/[id] — Delete guide with activity log
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for state-changing operations (PATCH, DELETE)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - AdminActivityService logging on all admin actions
 * - GuideService instantiated directly (not in ServiceRegistry)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 2 Content Types - Phase G7
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService } from '@core/services/GuideService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';
import { GuideStatus } from '@core/types/guide';

// ============================================================================
// Types
// ============================================================================

interface GuideSectionRow {
  id: number;
  title: string;
  section_number: number;
  estimated_time: number | null;
  sort_order: number;
}

// ============================================================================
// URL Parameter Extraction
// ============================================================================

function extractGuideIdFromUrl(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/admin/guides/[id]
  const guidesIndex = segments.indexOf('guides');
  const rawId = segments[guidesIndex + 1] ?? '';
  const id = parseInt(rawId, 10);

  if (isNaN(id) || id <= 0) {
    throw BizError.badRequest('Invalid guide ID');
  }

  return id;
}

// ============================================================================
// GET — Guide detail with sections (for preview modal)
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin guide detail', 'admin');
  }

  const url = new URL(request.url);
  const guideId = extractGuideIdFromUrl(url);

  const db = getDatabaseService();
  const guideService = new GuideService(db);

  const guide = await guideService.getGuideById(guideId);
  if (!guide) {
    throw BizError.notFound('Guide', guideId);
  }

  // Fetch sections separately (getGuideById does NOT return sections)
  const sectionsResult = await db.query<GuideSectionRow>(
    'SELECT id, title, section_number, estimated_time, sort_order FROM content_guide_sections WHERE guide_id = ? ORDER BY sort_order ASC',
    [guideId]
  );

  const guideWithSections = {
    ...guide,
    sections: sectionsResult.rows ?? [],
  };

  return createSuccessResponse({ guide: guideWithSections });
});

// ============================================================================
// PATCH — Update guide status or featured flag
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('update admin guide', 'admin');
  }

  const url = new URL(request.url);
  const guideId = extractGuideIdFromUrl(url);

  const body = await request.json() as {
    status?: string;
    is_featured?: boolean;
  };

  // Validate status if provided
  const validStatuses = Object.values(GuideStatus) as string[];
  if (body.status && !validStatuses.includes(body.status)) {
    throw BizError.badRequest(`Invalid guide status: ${body.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  const db = getDatabaseService();
  const guideService = new GuideService(db);
  const adminActivityService = getAdminActivityService();

  // Capture before state for publish notification check
  const before = await guideService.getGuideById(guideId);
  if (!before) {
    throw BizError.notFound('Guide', guideId);
  }

  const updates: { status?: GuideStatus; is_featured?: boolean } = {};
  if (body.status) updates.status = body.status as GuideStatus;
  if (typeof body.is_featured === 'boolean') updates.is_featured = body.is_featured;

  const updated = await guideService.updateGuide(guideId, updates);

  // Fire publish notification if status changed to published
  if (body.status === 'published' && before.status !== GuideStatus.PUBLISHED) {
    try {
      const { getContentNotificationService } = await import('@core/services/notification/ContentNotificationService');
      const notifService = getContentNotificationService();
      await notifService.notifyContentPublished('guide', guideId, before.listing_id);
    } catch {
      // best-effort — do not block response
    }
  }

  // Log admin activity
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'guide',
    targetEntityId: guideId,
    actionType: 'guide_status_update',
    actionCategory: 'moderation',
    actionDescription: `Admin updated guide #${guideId}`,
    afterData: body as Record<string, unknown>,
    severity: 'normal',
  });

  return createSuccessResponse({ guide: updated, message: 'Guide updated successfully' });
}));

// ============================================================================
// DELETE — Delete guide with activity log
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('delete admin guide', 'admin');
  }

  const url = new URL(request.url);
  const guideId = extractGuideIdFromUrl(url);

  const db = getDatabaseService();
  const guideService = new GuideService(db);
  const adminActivityService = getAdminActivityService();

  // Capture before data for audit
  const before = await guideService.getGuideById(guideId);
  if (!before) {
    throw BizError.notFound('Guide', guideId);
  }

  await guideService.deleteGuide(guideId);

  // Log admin activity
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'guide',
    targetEntityId: guideId,
    actionType: 'guide_delete',
    actionCategory: 'deletion',
    actionDescription: `Admin deleted guide #${guideId}: "${before.title}"`,
    beforeData: before as unknown as Record<string, unknown>,
    severity: 'high',
  });

  return createSuccessResponse({ message: 'Guide deleted successfully' });
}));
