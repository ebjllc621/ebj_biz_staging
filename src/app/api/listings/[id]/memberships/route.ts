/**
 * Listing Memberships API - Collection Routes
 * GET  /api/listings/[id]/memberships - Fetch all memberships for a listing (public)
 * POST /api/listings/[id]/memberships - Add a membership (listing owner or admin only)
 *
 * @authority CLAUDE.md - API Standards
 * @governance apiHandler wrapper, CSRF on mutations, credential verification
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// HELPERS
// ============================================================================

async function verifyListingOwnerOrAdmin(listingId: number, context: ApiContext): Promise<void> {
  if (!context.userId) throw BizError.unauthorized();

  const db = getDatabaseService();

  // Check if listing exists
  const listingRows = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const listing = listingRows.rows[0];
  if (!listing) throw BizError.notFound('Listing not found');

  // Owner check
  if (String(listing.user_id) === String(context.userId)) return;

  // Admin check
  const userRows = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [context.userId]
  );
  if (userRows.rows[0]?.role === 'admin') return;

  throw BizError.forbidden('You do not have permission to manage this listing');
}

// ============================================================================
// GET - Public: list all memberships for a listing
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async (context: ApiContext) => {
    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');

    const db = getDatabaseService();

    const result = await db.query<{
      id: number;
      listing_id: number;
      name: string;
      type: string;
      issuer: string | null;
      issuer_url: string | null;
      issued_date: string | null;
      expiry_date: string | null;
      verified: number;
      logo_url: string | null;
      display_order: number;
      created_at: string;
    }>(
      `SELECT id, listing_id, name, type, issuer, issuer_url,
              issued_date, expiry_date, verified, logo_url,
              display_order, created_at
       FROM listing_memberships
       WHERE listing_id = ?
       ORDER BY display_order ASC, created_at ASC`,
      [listingId]
    );

    const memberships = result.rows.map(row => ({
      ...row,
      id: bigIntToNumber(row.id),
      listing_id: bigIntToNumber(row.listing_id),
      display_order: bigIntToNumber(row.display_order),
      verified: Boolean(row.verified),
    }));

    return createSuccessResponse({ memberships }, context.requestId);
  }, {
    requireAuth: false,
    allowedMethods: ['GET', 'POST'],
  })(request);
}

// ============================================================================
// POST - Authenticated: add a membership
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCsrf(apiHandler(async (context: ApiContext) => {
    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');

    await verifyListingOwnerOrAdmin(listingId, context);

    const body = await context.request.json() as Record<string, unknown>;

    // Validate required fields
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw BizError.validation('name', body.name, 'Membership name is required');
    if (name.length > 255) throw BizError.validation('name', name, 'Name must be 255 characters or less');

    const validTypes = ['membership', 'certification', 'accolade', 'award'];
    const type = validTypes.includes(String(body.type ?? '')) ? String(body.type) : 'membership';

    const issuer = typeof body.issuer === 'string' ? body.issuer.trim() || null : null;
    const issuer_url = typeof body.issuer_url === 'string' ? body.issuer_url.trim() || null : null;
    const issued_date = typeof body.issued_date === 'string' ? body.issued_date || null : null;
    const expiry_date = typeof body.expiry_date === 'string' ? body.expiry_date || null : null;
    const logo_url = typeof body.logo_url === 'string' ? body.logo_url.trim() || null : null;

    // Check limit (max 20 per listing)
    const db = getDatabaseService();
    const countResult = await db.query<{ total: bigint }>(
      'SELECT COUNT(*) AS total FROM listing_memberships WHERE listing_id = ?',
      [listingId]
    );
    const total = bigIntToNumber((countResult.rows[0] as { total: bigint } | undefined)?.total ?? 0);
    if (total >= 20) throw BizError.badRequest('Maximum of 20 memberships allowed per listing');

    const insertResult = await db.query(
      `INSERT INTO listing_memberships
         (listing_id, name, type, issuer, issuer_url, issued_date, expiry_date, logo_url, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [listingId, name, type, issuer, issuer_url, issued_date, expiry_date, logo_url, total]
    );

    const newId = bigIntToNumber((insertResult as unknown as { insertId: bigint }).insertId ?? 0);

    const membership = {
      id: newId,
      listing_id: listingId,
      name,
      type,
      issuer,
      issuer_url,
      issued_date,
      expiry_date,
      verified: false,
      logo_url,
      display_order: total,
    };

    return createSuccessResponse({ membership }, context.requestId);
  }, {
    requireAuth: true,
    allowedMethods: ['GET', 'POST'],
  }))(request);
}
