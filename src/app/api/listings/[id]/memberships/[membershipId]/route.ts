/**
 * Listing Memberships API - Item Routes
 * PUT    /api/listings/[id]/memberships/[membershipId] - Update a membership
 * DELETE /api/listings/[id]/memberships/[membershipId] - Delete a membership
 *
 * @authority CLAUDE.md - API Standards
 * @governance apiHandler wrapper, CSRF on mutations, ownership verification
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

async function verifyMembershipOwnerOrAdmin(
  listingId: number,
  membershipId: number,
  context: ApiContext
): Promise<void> {
  if (!context.userId) throw BizError.unauthorized();

  const db = getDatabaseService();

  // Verify membership belongs to this listing
  const membershipRows = await db.query<{ id: number }>(
    'SELECT id FROM listing_memberships WHERE id = ? AND listing_id = ? LIMIT 1',
    [membershipId, listingId]
  );
  if (!membershipRows.rows[0]) throw BizError.notFound('Membership not found');

  // Check listing ownership
  const listingRows = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const listing = listingRows.rows[0];
  if (!listing) throw BizError.notFound('Listing not found');

  if (String(listing.user_id) === String(context.userId)) return;

  const userRows = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ? LIMIT 1',
    [context.userId]
  );
  if (userRows.rows[0]?.role === 'admin') return;

  throw BizError.forbidden('You do not have permission to manage this listing');
}

// ============================================================================
// PUT - Update a membership
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  return withCsrf(apiHandler(async (context: ApiContext) => {
    const { id, membershipId } = await params;
    const listingId = parseInt(id, 10);
    const mId = parseInt(membershipId, 10);
    if (isNaN(listingId) || isNaN(mId)) throw BizError.badRequest('Invalid ID');

    await verifyMembershipOwnerOrAdmin(listingId, mId, context);

    const body = await context.request.json() as Record<string, unknown>;

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

    const db = getDatabaseService();
    await db.query(
      `UPDATE listing_memberships
       SET name = ?, type = ?, issuer = ?, issuer_url = ?,
           issued_date = ?, expiry_date = ?, logo_url = ?
       WHERE id = ? AND listing_id = ?`,
      [name, type, issuer, issuer_url, issued_date, expiry_date, logo_url, mId, listingId]
    );

    const membership = {
      id: mId,
      listing_id: listingId,
      name,
      type,
      issuer,
      issuer_url,
      issued_date,
      expiry_date,
      logo_url,
    };

    return createSuccessResponse({ membership }, context.requestId);
  }, {
    requireAuth: true,
    allowedMethods: ['PUT', 'DELETE'],
  }))(request);
}

// ============================================================================
// DELETE - Remove a membership
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  return withCsrf(apiHandler(async (context: ApiContext) => {
    const { id, membershipId } = await params;
    const listingId = parseInt(id, 10);
    const mId = parseInt(membershipId, 10);
    if (isNaN(listingId) || isNaN(mId)) throw BizError.badRequest('Invalid ID');

    await verifyMembershipOwnerOrAdmin(listingId, mId, context);

    const db = getDatabaseService();
    await db.query(
      'DELETE FROM listing_memberships WHERE id = ? AND listing_id = ?',
      [mId, listingId]
    );

    return createSuccessResponse({ deleted: true, id: mId }, context.requestId);
  }, {
    requireAuth: true,
    allowedMethods: ['PUT', 'DELETE'],
  }))(request);
}
