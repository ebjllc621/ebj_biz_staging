/**
 * Admin External Reviews API Route
 *
 * GET /api/admin/external-reviews - Get all external review source connections
 *
 * Supports filters: page, pageSize, sortColumn, sortDirection, search, provider, status
 * When ?include=settings, also returns feature flag values from site_settings.
 *
 * @authority docs/components/admin/external-reviews/ADMIN_EXTERNAL_REVIEWS_BRAIN_PLAN.md
 * @tier STANDARD
 */

import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

// Sort column whitelist — prevents SQL injection
const SORT_WHITELIST = [
  'id',
  'listing_id',
  'provider',
  'status',
  'rating_summary',
  'review_count',
  'last_sync_at',
  'created_at'
];

const SETTINGS_KEYS = [
  'feature_external_reviews_enabled',
  'feature_external_reviews_google',
  'feature_external_reviews_yelp',
  'feature_external_reviews_facebook'
];

interface ExternalReviewSourceRow {
  id: bigint | number | null;
  listing_id: bigint | number | null;
  provider: string;
  provider_entity_id: string | null;
  canonical_url: string | null;
  rating_summary: number | null;
  review_count: bigint | number | null;
  last_sync_at: string | null;
  status: string;
  created_at: string;
  listing_name: string | null;
  owner_name: string | null;
}

interface CountRow {
  total: bigint | number | null;
}

interface SettingRow {
  setting_key: string;
  setting_value: string | null;
}

export const GET = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const sp = url.searchParams;

  // Parse pagination
  const page = Math.max(1, parseInt(sp.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '20')));
  const offset = (page - 1) * pageSize;

  // Parse sort
  const rawSortColumn = sp.get('sortColumn') || 'created_at';
  const sortColumn = SORT_WHITELIST.includes(rawSortColumn) ? rawSortColumn : 'created_at';
  const sortDirection = sp.get('sortDirection') === 'asc' ? 'ASC' : 'DESC';

  // Parse filters
  const search = sp.get('search') || '';
  const provider = sp.get('provider') || '';
  const status = sp.get('status') || '';
  const includeSettings = sp.get('include') === 'settings';

  const db = getDatabaseService();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push('(l.name LIKE ? OR ers.provider LIKE ? OR ers.provider_entity_id LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (provider) {
    conditions.push('ers.provider = ?');
    params.push(provider);
  }
  if (status) {
    conditions.push('ers.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const baseQuery = `
    FROM external_review_sources ers
    LEFT JOIN listings l ON ers.listing_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    ${whereClause}
  `;

  const countResult = await db.query<CountRow>(
    `SELECT COUNT(*) as total ${baseQuery}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.total);

  const dataResult = await db.query<ExternalReviewSourceRow>(
    `SELECT
      ers.id,
      ers.listing_id,
      ers.provider,
      ers.provider_entity_id,
      ers.canonical_url,
      ers.rating_summary,
      ers.review_count,
      ers.last_sync_at,
      ers.status,
      ers.created_at,
      l.name as listing_name,
      COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as owner_name
    ${baseQuery}
    ORDER BY ers.${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const connections = dataResult.rows.map(row => ({
    id: bigIntToNumber(row.id),
    listing_id: bigIntToNumber(row.listing_id),
    listing_name: row.listing_name || null,
    owner_name: row.owner_name || null,
    provider: row.provider,
    provider_entity_id: row.provider_entity_id || null,
    canonical_url: row.canonical_url || null,
    rating_summary: row.rating_summary ?? null,
    review_count: bigIntToNumber(row.review_count),
    last_sync_at: row.last_sync_at || null,
    status: row.status,
    created_at: row.created_at
  }));

  const responseData: Record<string, unknown> = {
    connections,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };

  if (includeSettings) {
    const settingsResult = await db.query<SettingRow>(
      `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${SETTINGS_KEYS.map(() => '?').join(', ')})`,
      SETTINGS_KEYS
    );
    const settings: Record<string, boolean> = {};
    for (const key of SETTINGS_KEYS) {
      const row = settingsResult.rows.find(r => r.setting_key === key);
      settings[key] = row?.setting_value === 'true' || row?.setting_value === '1';
    }
    responseData.settings = settings;
  }

  return createSuccessResponse(responseData, context.requestId);
}, { requireAuth: true, allowedMethods: ['GET'] });
