/**
 * Admin Creator Profile Detail API Route
 * PATCH /api/admin/creator-profiles/[id] - Admin actions (verify, feature, suspend, activate)
 * PUT   /api/admin/creator-profiles/[id] - Edit profile data (display_name, bio, etc.)
 *
 * GOVERNANCE COMPLIANCE:
 * - withCsrf(apiHandler(...)) wrapper: MANDATORY for state-changing routes
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - Notification dispatch for verify/suspend actions
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 3 Creator Profiles - Phase 7
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { PodcasterService } from '@core/services/PodcasterService';
import { NotificationService } from '@core/services/NotificationService';

/**
 * Extract profile ID from URL path
 */
function extractProfileId(url: URL): number {
  const pathParts = url.pathname.split('/');
  // path: /api/admin/creator-profiles/[id]
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Profile ID is required', {});
  }

  const profileId = parseInt(id, 10);

  if (isNaN(profileId)) {
    throw BizError.badRequest('Invalid profile ID', { id });
  }

  return profileId;
}

/**
 * PATCH /api/admin/creator-profiles/[id]
 * Admin actions: verify, unverify, feature, unfeature, suspend, activate
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('manage creator profiles', 'admin');
  }

  const url = new URL(request.url);
  const profileId = extractProfileId(url);

  const body = await request.json();
  const { type, action } = body as {
    type: 'affiliate-marketers' | 'internet-personalities' | 'podcasters';
    action: 'verify' | 'unverify' | 'feature' | 'unfeature' | 'suspend' | 'activate';
  };

  if (!type || (type !== 'affiliate-marketers' && type !== 'internet-personalities' && type !== 'podcasters')) {
    throw BizError.badRequest('type is required: affiliate-marketers | internet-personalities | podcasters', { type });
  }

  if (!action) {
    throw BizError.badRequest('action is required', { action });
  }

  const db = getDatabaseService();

  // Build update data based on action
  const updateData: Record<string, boolean | string> = {};
  let message = '';
  let notificationType: 'content.profile_verified' | 'content.profile_suspended' | null = null;
  let notificationTitle = '';
  let notificationMessage = '';

  switch (action) {
    case 'verify':
      updateData['is_verified'] = true;
      message = 'Profile verified successfully';
      notificationType = 'content.profile_verified';
      notificationTitle = 'Your profile has been verified';
      break;
    case 'unverify':
      updateData['is_verified'] = false;
      message = 'Profile verification removed';
      break;
    case 'feature':
      updateData['is_featured'] = true;
      message = 'Profile featured successfully';
      break;
    case 'unfeature':
      updateData['is_featured'] = false;
      message = 'Profile unfeatured';
      break;
    case 'suspend':
      updateData['status'] = 'suspended';
      message = 'Profile suspended';
      notificationType = 'content.profile_suspended';
      notificationTitle = 'Your profile has been suspended';
      break;
    case 'activate':
      updateData['status'] = 'active';
      message = 'Profile activated';
      break;
    default:
      throw BizError.badRequest('Invalid action', { action });
  }

  if (type === 'affiliate-marketers') {
    const service = new AffiliateMarketerService(db);
    const profile = await service.updateProfile(profileId, updateData as Parameters<typeof service.updateProfile>[1]);

    // Dispatch notification for verify/suspend
    if (notificationType) {
      notificationMessage = `Your affiliate marketer profile "${profile.display_name}" status has been updated`;
      const notificationService = new NotificationService(db);
      notificationService.dispatch({
        type: notificationType,
        recipientId: profile.user_id,
        title: notificationTitle,
        message: notificationMessage,
        entityType: 'content',
        entityId: profile.id,
        priority: 'normal',
        triggeredBy: user.id,
      }).catch(() => {});
    }

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'affiliate_marketer',
      targetEntityId: profileId,
      actionType: `profile_${action}`,
      actionCategory: 'update',
      actionDescription: `${action} affiliate marketer profile #${profileId}`,
      afterData: updateData,
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  } else if (type === 'internet-personalities') {
    const service = new InternetPersonalityService(db);
    const profile = await service.updateProfile(profileId, updateData as Parameters<typeof service.updateProfile>[1]);

    // Dispatch notification for verify/suspend
    if (notificationType) {
      notificationMessage = `Your internet personality profile "${profile.display_name}" status has been updated`;
      const notificationService = new NotificationService(db);
      notificationService.dispatch({
        type: notificationType,
        recipientId: profile.user_id,
        title: notificationTitle,
        message: notificationMessage,
        entityType: 'content',
        entityId: profile.id,
        priority: 'normal',
        triggeredBy: user.id,
      }).catch(() => {});
    }

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'internet_personality',
      targetEntityId: profileId,
      actionType: `profile_${action}`,
      actionCategory: 'update',
      actionDescription: `${action} internet personality profile #${profileId}`,
      afterData: updateData,
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  } else {
    // podcasters
    const service = new PodcasterService(db);
    const profile = await service.updateProfile(profileId, updateData as Parameters<typeof service.updateProfile>[1]);

    // Dispatch notification for verify/suspend
    if (notificationType) {
      notificationMessage = `Your podcaster profile "${profile.display_name}" status has been updated`;
      const notificationService = new NotificationService(db);
      notificationService.dispatch({
        type: notificationType,
        recipientId: profile.user_id,
        title: notificationTitle,
        message: notificationMessage,
        entityType: 'content',
        entityId: profile.id,
        priority: 'normal',
        triggeredBy: user.id,
      }).catch(() => {});
    }

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'podcaster',
      targetEntityId: profileId,
      actionType: `profile_${action}`,
      actionCategory: 'update',
      actionDescription: `${action} podcaster profile #${profileId}`,
      afterData: updateData,
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  }
}));

/**
 * PUT /api/admin/creator-profiles/[id]
 * Admin edit of profile data (display_name, bio, etc.)
 * Body: { type, ...profileFields }
 */
export const PUT = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('edit creator profiles', 'admin');
  }

  const url = new URL(request.url);
  const profileId = extractProfileId(url);

  const body = await request.json() as Record<string, unknown>;
  const { type, ...updateFields } = body;

  if (!type || (type !== 'affiliate-marketers' && type !== 'internet-personalities' && type !== 'podcasters')) {
    throw BizError.badRequest('type is required: affiliate-marketers | internet-personalities | podcasters', { type });
  }

  const db = getDatabaseService();
  let updated;

  if (type === 'affiliate-marketers') {
    const service = new AffiliateMarketerService(db);
    updated = await service.updateProfile(
      profileId,
      updateFields as Parameters<typeof service.updateProfile>[1]
    );
  } else if (type === 'internet-personalities') {
    const service = new InternetPersonalityService(db);
    updated = await service.updateProfile(
      profileId,
      updateFields as Parameters<typeof service.updateProfile>[1]
    );
  } else {
    const service = new PodcasterService(db);
    updated = await service.updateProfile(
      profileId,
      updateFields as Parameters<typeof service.updateProfile>[1]
    );
  }

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: type === 'affiliate-marketers' ? 'affiliate_marketer' : type === 'internet-personalities' ? 'internet_personality' : 'podcaster',
    targetEntityId: profileId,
    actionType: 'profile_edit',
    actionCategory: 'update',
    actionDescription: `Admin edited ${type} profile #${profileId}`,
    afterData: updateFields,
    severity: 'normal',
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    sessionId: request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ profile: updated });
}));
