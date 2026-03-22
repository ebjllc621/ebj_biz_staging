/**
 * Candidate Discovery API Route
 *
 * GET /api/listings/[id]/jobs/candidates - Get discovered candidates
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import type { CandidateDiscoveryRow } from '@core/types/db-rows';

function extractListingId(url: string): number {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  if (!listingIdStr) throw BizError.badRequest('Listing ID is required');
  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');
  return listingId;
}

async function verifyListingOwnership(listingId: number, userId: number): Promise<boolean> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  return result.rows[0]?.user_id === userId;
}

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) throw BizError.unauthorized('Authentication required');

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) throw BizError.forbidden('view candidates', 'listing');

  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  const status = searchParams.get('status');
  const minMatchScore = searchParams.get('min_match_score');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const db = getDatabaseService();

  const conditions: string[] = ['cd.listing_id = ?'];
  const queryParams: unknown[] = [listingId];

  if (status) {
    conditions.push('cd.status = ?');
    queryParams.push(status);
  }

  if (minMatchScore) {
    conditions.push('cd.match_score >= ?');
    queryParams.push(parseFloat(minMatchScore));
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM candidate_discovery cd
    WHERE ${conditions.join(' AND ')}
  `;

  const countResult = await db.query<{ total: bigint }>(countQuery, queryParams);
  const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

  const offset = (page - 1) * limit;
  const selectParams = [...queryParams, limit, offset];

  const query = `
    SELECT
      cd.*,
      u.display_name as job_seeker_name,
      jsp.headline as job_seeker_headline,
      jsp.skills as job_seeker_skills,
      jsp.experience_level as job_seeker_experience_level
    FROM candidate_discovery cd
    JOIN users u ON cd.job_seeker_user_id = u.id
    LEFT JOIN job_seeker_profiles jsp ON cd.job_seeker_user_id = jsp.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY cd.match_score DESC, cd.discovered_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db.query<CandidateDiscoveryRow & {
    job_seeker_name: string;
    job_seeker_headline: string | null;
    job_seeker_skills: string | null;
    job_seeker_experience_level: string | null;
  }>(query, selectParams);

  const candidates = result.rows.map(row => ({
    id: row.id,
    job_seeker_user_id: row.job_seeker_user_id,
    listing_id: row.listing_id,
    match_score: row.match_score ? parseFloat(String(row.match_score)) : null,
    matched_skills: row.matched_skills ? safeJsonParse<string[]>(row.matched_skills, []) : null,
    discovered_at: new Date(row.discovered_at),
    viewed_at: row.viewed_at ? new Date(row.viewed_at) : null,
    contacted_at: row.contacted_at ? new Date(row.contacted_at) : null,
    contact_method: row.contact_method,
    status: row.status,
    employer_notes: row.employer_notes,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    job_seeker_name: row.job_seeker_name,
    job_seeker_headline: row.job_seeker_headline,
    job_seeker_skills: row.job_seeker_skills ? safeJsonParse<string[]>(row.job_seeker_skills, []) : null,
    job_seeker_experience_level: row.job_seeker_experience_level
  }));

  return createSuccessResponse({
    candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, context.requestId);
});
