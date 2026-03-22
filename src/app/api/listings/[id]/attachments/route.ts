/**
 * Listing Attachments API Route
 * GET  /api/listings/[id]/attachments - List attachments for a listing
 * POST /api/listings/[id]/attachments - Create an attachment record
 * DELETE /api/listings/[id]/attachments - Delete an attachment (by attachmentId in body)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for POST/DELETE
 * - getUserFromRequest: MANDATORY for auth
 * - createSuccessResponse: MANDATORY for responses
 * - bigIntToNumber: MANDATORY for COUNT queries
 * - mariadb driver via DatabaseService (NOT mysql2)
 * - Listing ownership verified before all mutations
 * - Tier limits enforced server-side
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { ListingAttachmentRow } from '@core/types/db-rows';

// ============================================================================
// TIER LIMITS FOR ATTACHMENTS
// ============================================================================

const ATTACHMENT_TIER_LIMITS: Record<string, number> = {
  essentials: 0,
  plus: 3,
  preferred: 10,
  premium: 10
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract listing ID from URL path (before 'attachments' segment)
 */
function extractListingId(url: string): number {
  const urlObj = new URL(url);
  const segments = urlObj.pathname.split('/');
  // /api/listings/[id]/attachments -> segments: ['', 'api', 'listings', '[id]', 'attachments']
  const idIndex = segments.indexOf('attachments') - 1;
  const id = segments[idIndex];
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }
  return listingId;
}

/**
 * Verify listing ownership: user must own the listing or be admin
 */
async function verifyListingOwnership(
  db: ReturnType<typeof getDatabaseService>,
  listingId: number,
  userId: number,
  userRole: string
): Promise<{ tier: string }> {
  const result = await db.query<{ tier: string; user_id: number | null }>(
    'SELECT tier, user_id FROM listings WHERE id = ? AND status != ?',
    [listingId, 'deleted']
  );
  if (!result.rows || result.rows.length === 0) {
    throw BizError.notFound('Listing', listingId);
  }
  const listing = result.rows[0];
  if (!listing) {
    throw BizError.notFound('Listing', listingId);
  }
  if (listing.user_id !== userId && userRole !== 'admin') {
    throw BizError.forbidden('manage attachments for', 'listing');
  }
  return { tier: listing.tier };
}

// ============================================================================
// GET /api/listings/[id]/attachments
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);

  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  await verifyListingOwnership(db, listingId, user.id, user.role);

  const result = await db.query<ListingAttachmentRow>(
    `SELECT id, listing_id, filename, display_name, file_type, file_size,
            category, download_count, url, alt_text, created_at, updated_at
     FROM listing_attachments
     WHERE listing_id = ?
     ORDER BY created_at DESC`,
    [listingId]
  );

  const attachments = result.rows ?? [];

  // Get total count
  const countResult = await db.query<{ total: bigint | number }>(
    'SELECT COUNT(*) as total FROM listing_attachments WHERE listing_id = ?',
    [listingId]
  );
  const count = bigIntToNumber(countResult.rows?.[0]?.total ?? 0);

  return createSuccessResponse(
    { attachments, count },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

// ============================================================================
// POST /api/listings/[id]/attachments
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);

  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const { tier } = await verifyListingOwnership(db, listingId, user.id, user.role);

  // Enforce tier limits server-side
  const tierLimit = ATTACHMENT_TIER_LIMITS[tier] ?? 0;
  if (tierLimit === 0) {
    throw BizError.forbidden('add attachments on essentials tier — upgrade your plan', 'listing');
  }

  const countResult = await db.query<{ total: bigint | number }>(
    'SELECT COUNT(*) as total FROM listing_attachments WHERE listing_id = ?',
    [listingId]
  );
  const currentCount = bigIntToNumber(countResult.rows?.[0]?.total ?? 0);

  if (currentCount >= tierLimit) {
    throw BizError.badRequest(
      `Attachment limit reached. Your ${tier} tier allows ${tierLimit} attachment(s).`
    );
  }

  // Parse request body
  const body = await context.request.json() as {
    url?: string;
    filename?: string;
    display_name?: string;
    file_type?: string;
    file_size?: number;
    category?: string;
    alt_text?: string;
  };

  const { url, filename, display_name, file_type, file_size, category, alt_text } = body;

  if (!url) {
    throw BizError.badRequest('url is required');
  }
  if (!filename) {
    throw BizError.badRequest('filename is required');
  }
  if (!display_name) {
    throw BizError.badRequest('display_name is required');
  }

  const validCategories = ['brochure', 'menu', 'catalog', 'legal', 'other'];
  const resolvedCategory = validCategories.includes(category ?? '') ? category : 'other';

  const insertResult = await db.query<{ insertId: number | bigint }>(
    `INSERT INTO listing_attachments
       (listing_id, filename, display_name, file_type, file_size, category, url, alt_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listingId,
      filename,
      display_name,
      file_type ?? null,
      file_size ?? 0,
      resolvedCategory,
      url,
      alt_text ?? null
    ]
  );

  const insertId = bigIntToNumber(insertResult.rows?.[0]?.insertId ?? 0) ||
    bigIntToNumber((insertResult as unknown as { insertId?: number | bigint }).insertId ?? 0);

  // Fetch newly created row
  const newRow = await db.query<ListingAttachmentRow>(
    `SELECT id, listing_id, filename, display_name, file_type, file_size,
            category, download_count, url, alt_text, created_at, updated_at
     FROM listing_attachments WHERE id = ?`,
    [insertId]
  );

  const attachment = newRow.rows?.[0] ?? null;

  return createSuccessResponse(
    { attachment },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));

// ============================================================================
// DELETE /api/listings/[id]/attachments
// Body: { attachmentId: number }
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);

  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  await verifyListingOwnership(db, listingId, user.id, user.role);

  const body = await context.request.json() as { attachmentId?: number };
  const { attachmentId } = body;

  if (!attachmentId) {
    throw BizError.badRequest('attachmentId is required');
  }

  // Verify attachment belongs to this listing
  const checkResult = await db.query<{ id: number }>(
    'SELECT id FROM listing_attachments WHERE id = ? AND listing_id = ?',
    [attachmentId, listingId]
  );
  if (!checkResult.rows || checkResult.rows.length === 0) {
    throw BizError.notFound('Attachment', attachmentId);
  }

  await db.query(
    'DELETE FROM listing_attachments WHERE id = ? AND listing_id = ?',
    [attachmentId, listingId]
  );

  return createSuccessResponse(
    { deleted: true, attachmentId },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['DELETE']
}));
