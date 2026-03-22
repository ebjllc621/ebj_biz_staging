/**
 * Admin Creator Profiles API Route
 * GET  /api/admin/creator-profiles - List profiles with stats
 * POST /api/admin/creator-profiles - Create profile (admin)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for state-changing operations (POST)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber for all COUNT(*) results
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 3 Creator Profiles - Phase 7
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { PodcasterService } from '@core/services/PodcasterService';

/**
 * GET /api/admin/creator-profiles
 * List profiles with stats for admin
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access creator profiles management', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse required type param
  const type = searchParams.get('type') as 'affiliate-marketers' | 'internet-personalities' | 'podcasters' | null;

  if (!type || (type !== 'affiliate-marketers' && type !== 'internet-personalities' && type !== 'podcasters')) {
    throw BizError.badRequest('type is required: affiliate-marketers | internet-personalities | podcasters', { type });
  }

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const searchQuery = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';

  const db = getDatabaseService();

  if (type === 'affiliate-marketers') {
    const service = new AffiliateMarketerService(db);

    const filters: Record<string, unknown> = {};
    if (statusFilter) filters['status'] = statusFilter;
    if (searchQuery) filters['searchQuery'] = searchQuery;

    const result = await service.getProfilesAdmin(
      filters as Parameters<typeof service.getProfilesAdmin>[0],
      { page, pageSize: limit }
    );
    const stats = await service.getAdminStats();

    // Enrich with recommendation counts from user_referrals
    const profileIds = result.data.map(p => p.id);
    let recommendationMap: Record<number, number> = {};
    let pendingReviewMap: Record<number, number> = {};

    if (profileIds.length > 0) {
      const placeholders = profileIds.map(() => '?').join(', ');

      const refResult = await db.query<{ entity_id: number; cnt: bigint | number }>(
        `SELECT entity_id, COUNT(*) as cnt FROM user_referrals
         WHERE entity_type = 'affiliate_marketer' AND entity_id IN (${placeholders})
         GROUP BY entity_id`,
        profileIds
      );
      for (const row of refResult.rows) {
        recommendationMap[row.entity_id] = bigIntToNumber(row.cnt);
      }

      const reviewResult = await db.query<{ marketer_id: number; cnt: bigint | number }>(
        `SELECT marketer_id, COUNT(*) as cnt FROM affiliate_marketer_reviews
         WHERE status = 'pending' AND marketer_id IN (${placeholders})
         GROUP BY marketer_id`,
        profileIds
      );
      for (const row of reviewResult.rows) {
        pendingReviewMap[row.marketer_id] = bigIntToNumber(row.cnt);
      }
    }

    const profiles = result.data.map(p => ({
      ...p,
      recommendation_count: recommendationMap[p.id] ?? 0,
      pending_review_count: pendingReviewMap[p.id] ?? 0
    }));

    return createSuccessResponse({
      profiles,
      pagination: result.pagination,
      stats
    });
  } else if (type === 'internet-personalities') {
    const service = new InternetPersonalityService(db);

    const filters: Record<string, unknown> = {};
    if (statusFilter) filters['status'] = statusFilter;
    if (searchQuery) filters['searchQuery'] = searchQuery;

    const result = await service.getProfilesAdmin(
      filters as Parameters<typeof service.getProfilesAdmin>[0],
      { page, pageSize: limit }
    );
    const stats = await service.getAdminStats();

    // Enrich with recommendation counts from user_referrals
    const profileIds = result.data.map(p => p.id);
    let recommendationMap: Record<number, number> = {};
    let pendingReviewMap: Record<number, number> = {};

    if (profileIds.length > 0) {
      const placeholders = profileIds.map(() => '?').join(', ');

      const refResult = await db.query<{ entity_id: number; cnt: bigint | number }>(
        `SELECT entity_id, COUNT(*) as cnt FROM user_referrals
         WHERE entity_type = 'internet_personality' AND entity_id IN (${placeholders})
         GROUP BY entity_id`,
        profileIds
      );
      for (const row of refResult.rows) {
        recommendationMap[row.entity_id] = bigIntToNumber(row.cnt);
      }

      const reviewResult = await db.query<{ personality_id: number; cnt: bigint | number }>(
        `SELECT personality_id, COUNT(*) as cnt FROM internet_personality_reviews
         WHERE status = 'pending' AND personality_id IN (${placeholders})
         GROUP BY personality_id`,
        profileIds
      );
      for (const row of reviewResult.rows) {
        pendingReviewMap[row.personality_id] = bigIntToNumber(row.cnt);
      }
    }

    const profiles = result.data.map(p => ({
      ...p,
      recommendation_count: recommendationMap[p.id] ?? 0,
      pending_review_count: pendingReviewMap[p.id] ?? 0
    }));

    return createSuccessResponse({
      profiles,
      pagination: result.pagination,
      stats
    });
  } else {
    // podcasters
    const service = new PodcasterService(db);

    const filters: Record<string, unknown> = {};
    if (statusFilter) filters['status'] = statusFilter;
    if (searchQuery) filters['searchQuery'] = searchQuery;

    const result = await service.getProfilesAdmin(
      filters as Parameters<typeof service.getProfilesAdmin>[0],
      { page, pageSize: limit }
    );
    const stats = await service.getAdminStats();

    // Enrich with recommendation counts from user_referrals
    const profileIds = result.data.map(p => p.id);
    let recommendationMap: Record<number, number> = {};
    let pendingReviewMap: Record<number, number> = {};

    if (profileIds.length > 0) {
      const placeholders = profileIds.map(() => '?').join(', ');

      const refResult = await db.query<{ entity_id: number; cnt: bigint | number }>(
        `SELECT entity_id, COUNT(*) as cnt FROM user_referrals
         WHERE entity_type = 'podcaster' AND entity_id IN (${placeholders})
         GROUP BY entity_id`,
        profileIds
      );
      for (const row of refResult.rows) {
        recommendationMap[row.entity_id] = bigIntToNumber(row.cnt);
      }

      const reviewResult = await db.query<{ podcaster_id: number; cnt: bigint | number }>(
        `SELECT podcaster_id, COUNT(*) as cnt FROM podcaster_reviews
         WHERE status = 'pending' AND podcaster_id IN (${placeholders})
         GROUP BY podcaster_id`,
        profileIds
      );
      for (const row of reviewResult.rows) {
        pendingReviewMap[row.podcaster_id] = bigIntToNumber(row.cnt);
      }
    }

    const profiles = result.data.map(p => ({
      ...p,
      recommendation_count: recommendationMap[p.id] ?? 0,
      pending_review_count: pendingReviewMap[p.id] ?? 0
    }));

    return createSuccessResponse({
      profiles,
      pagination: result.pagination,
      stats
    });
  }
});

/**
 * POST /api/admin/creator-profiles
 * Admin-initiated profile creation
 * Body: { profileType, user_id, display_name, ...profileFields }
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('create creator profiles', 'admin');
  }

  const body = await request.json() as Record<string, unknown>;
  const { profileType, user_id, display_name, ...fields } = body;

  // Validate profileType
  if (!profileType || !['affiliate_marketer', 'internet_personality', 'podcaster'].includes(profileType as string)) {
    throw BizError.badRequest('profileType must be affiliate_marketer, internet_personality, or podcaster');
  }

  // Validate user_id
  if (!user_id || typeof user_id !== 'number') {
    throw BizError.badRequest('user_id is required and must be a number');
  }

  // Validate display_name
  if (!display_name || typeof display_name !== 'string' || (display_name as string).trim().length < 2 || (display_name as string).trim().length > 255) {
    throw BizError.badRequest('display_name is required and must be 2-255 characters');
  }

  const db = getDatabaseService();

  // Verify target user exists
  const userCheck = await db.query<{ id: number }>(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [user_id]
  );
  if (!userCheck.rows.length) {
    throw BizError.badRequest('Target user does not exist', { user_id });
  }

  let created;

  if (profileType === 'affiliate_marketer') {
    const service = new AffiliateMarketerService(db);
    const existing = await service.getProfileByUserId(user_id as number);
    if (existing) {
      throw BizError.badRequest('User already has an affiliate marketer profile');
    }
    created = await service.createProfile(user_id as number, {
      ...(fields as Record<string, unknown>),
      display_name: (display_name as string).trim(),
    } as Parameters<typeof service.createProfile>[1]);
  } else if (profileType === 'internet_personality') {
    const service = new InternetPersonalityService(db);
    const existing = await service.getProfileByUserId(user_id as number);
    if (existing) {
      throw BizError.badRequest('User already has an internet personality profile');
    }
    created = await service.createProfile(user_id as number, {
      ...(fields as Record<string, unknown>),
      display_name: (display_name as string).trim(),
    } as Parameters<typeof service.createProfile>[1]);
  } else {
    const service = new PodcasterService(db);
    const existing = await service.getProfileByUserId(user_id as number);
    if (existing) {
      throw BizError.badRequest('User already has a podcaster profile');
    }
    created = await service.createProfile(user_id as number, {
      ...(fields as Record<string, unknown>),
      display_name: (display_name as string).trim(),
    } as Parameters<typeof service.createProfile>[1]);
  }

  return createSuccessResponse({ profile: created });
}));
