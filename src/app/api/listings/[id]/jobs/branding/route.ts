/**
 * Employer Branding API Route
 *
 * GET /api/listings/[id]/jobs/branding - Get employer branding
 * POST /api/listings/[id]/jobs/branding - Create employer branding
 * PUT /api/listings/[id]/jobs/branding - Update employer branding
 * DELETE /api/listings/[id]/jobs/branding - Delete employer branding
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse with requestId
 * - Service boundary: DatabaseService (employer_branding table)
 * - Authentication: REQUIRED (listing owner)
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { EmployerBrandingRow } from '@core/types/db-rows';
import type { CreateEmployerBrandingInput, UpdateEmployerBrandingInput } from '@features/jobs/types';

/**
 * Extract listing ID from URL path
 */
function extractListingId(url: string): number {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  return listingId;
}

/**
 * Verify listing ownership
 */
async function verifyListingOwnership(listingId: number, userId: number): Promise<boolean> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );

  return result.rows[0]?.user_id === userId;
}

/**
 * GET /api/listings/[id]/jobs/branding
 * Get employer branding for a listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);
  const db = getDatabaseService();

  const result = await db.query<EmployerBrandingRow>(
    'SELECT * FROM employer_branding WHERE listing_id = ? LIMIT 1',
    [listingId]
  );

  const branding = result.rows[0];
  if (!branding) {
    throw BizError.notFound('Employer branding', String(listingId));
  }

  return createSuccessResponse({
    branding: {
      ...branding,
      created_at: new Date(branding.created_at),
      updated_at: new Date(branding.updated_at)
    }
  }, context.requestId);
});

/**
 * POST /api/listings/[id]/jobs/branding
 * Create employer branding
 */
export const POST = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  // Verify ownership
  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) {
    throw BizError.forbidden('manage', 'listing');
  }

  const body = await context.request.json() as CreateEmployerBrandingInput;
  const db = getDatabaseService();

  // Check if branding already exists
  const existingResult = await db.query<{ id: number }>(
    'SELECT id FROM employer_branding WHERE listing_id = ? LIMIT 1',
    [listingId]
  );

  if (existingResult.rows.length > 0) {
    throw BizError.badRequest('Employer branding already exists for this listing');
  }

  const query = `
    INSERT INTO employer_branding (
      listing_id, headline, tagline, company_culture, benefits_highlight,
      team_size, growth_stage, hiring_urgency, featured_media_url,
      cta_text, cta_url, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const insertParams = [
    listingId,
    body.headline || null,
    body.tagline || null,
    body.company_culture || null,
    body.benefits_highlight || null,
    body.team_size || null,
    body.growth_stage || null,
    body.hiring_urgency || 'ongoing',
    body.featured_media_url || null,
    body.cta_text || 'View Open Positions',
    body.cta_url || null,
    body.status || 'draft'
  ];

  const insertResult = await db.query(query, insertParams);
  const insertId = bigIntToNumber(insertResult.insertId);

  // Fetch created branding
  const fetchResult = await db.query<EmployerBrandingRow>(
    'SELECT * FROM employer_branding WHERE id = ? LIMIT 1',
    [insertId]
  );

  const branding = fetchResult.rows[0];
  if (!branding) {
    throw BizError.internalServerError('employer_branding', new Error('Failed to create'));
  }

  return createSuccessResponse({
    branding: {
      ...branding,
      created_at: new Date(branding.created_at),
      updated_at: new Date(branding.updated_at)
    }
  }, context.requestId);
});

/**
 * PUT /api/listings/[id]/jobs/branding
 * Update employer branding
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  // Verify ownership
  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) {
    throw BizError.forbidden('manage', 'listing');
  }

  const body = await context.request.json() as UpdateEmployerBrandingInput;
  const db = getDatabaseService();

  const updates: string[] = [];
  const updateParams: unknown[] = [];

  if (body.headline !== undefined) {
    updates.push('headline = ?');
    updateParams.push(body.headline);
  }
  if (body.tagline !== undefined) {
    updates.push('tagline = ?');
    updateParams.push(body.tagline);
  }
  if (body.company_culture !== undefined) {
    updates.push('company_culture = ?');
    updateParams.push(body.company_culture);
  }
  if (body.benefits_highlight !== undefined) {
    updates.push('benefits_highlight = ?');
    updateParams.push(body.benefits_highlight);
  }
  if (body.team_size !== undefined) {
    updates.push('team_size = ?');
    updateParams.push(body.team_size);
  }
  if (body.growth_stage !== undefined) {
    updates.push('growth_stage = ?');
    updateParams.push(body.growth_stage);
  }
  if (body.hiring_urgency !== undefined) {
    updates.push('hiring_urgency = ?');
    updateParams.push(body.hiring_urgency);
  }
  if (body.featured_media_url !== undefined) {
    updates.push('featured_media_url = ?');
    updateParams.push(body.featured_media_url);
  }
  if (body.cta_text !== undefined) {
    updates.push('cta_text = ?');
    updateParams.push(body.cta_text);
  }
  if (body.cta_url !== undefined) {
    updates.push('cta_url = ?');
    updateParams.push(body.cta_url);
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    updateParams.push(body.status);
  }

  if (updates.length === 0) {
    throw BizError.badRequest('No fields to update');
  }

  updates.push('updated_at = NOW()');
  updateParams.push(listingId);

  const query = `UPDATE employer_branding SET ${updates.join(', ')} WHERE listing_id = ?`;
  await db.query(query, updateParams);

  // Fetch updated branding
  const fetchResult = await db.query<EmployerBrandingRow>(
    'SELECT * FROM employer_branding WHERE listing_id = ? LIMIT 1',
    [listingId]
  );

  const branding = fetchResult.rows[0];
  if (!branding) {
    throw BizError.notFound('Employer branding', String(listingId));
  }

  return createSuccessResponse({
    branding: {
      ...branding,
      created_at: new Date(branding.created_at),
      updated_at: new Date(branding.updated_at)
    }
  }, context.requestId);
});

/**
 * DELETE /api/listings/[id]/jobs/branding
 * Delete employer branding
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  // Verify ownership
  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) {
    throw BizError.forbidden('manage', 'listing');
  }

  const db = getDatabaseService();
  await db.query('DELETE FROM employer_branding WHERE listing_id = ?', [listingId]);

  return createSuccessResponse({ message: 'Employer branding deleted successfully' }, context.requestId);
});
