/**
 * Admin Listings Individual Item API Routes
 * DELETE /api/admin/listings/[id] - Delete a listing
 *
 * GOVERNANCE COMPLIANCE:
 * - Authentication: Admin-only
 * - Response format: JSON with success/error
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 0 - Admin Realignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { ErrorService } from '@core/services/ErrorService';

/**
 * DELETE /api/admin/listings/[id]
 * Delete a listing by ID (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: 'Authentication required' } },
      { status: 401 }
    );
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { message: 'Admin access required' } },
      { status: 403 }
    );
  }

  const listingId = parseInt(params.id);

  if (isNaN(listingId)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid listing ID' } },
      { status: 400 }
    );
  }

  try {
    const db = getDatabaseService();

    // Capture before data for audit
    const beforeResult = await db.query<{ id: number; name: string; status: string }>(
      'SELECT id, name, status FROM listings WHERE id = ?',
      [listingId]
    );

    // Admin delete - direct database operation (bypasses ownership check)
    const result = await db.query(
      'DELETE FROM listings WHERE id = ?',
      [listingId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Listing not found' } },
        { status: 404 }
      );
    }

    // Log admin activity (non-blocking)
    const beforeData = beforeResult.rows[0];
    getAdminActivityService().logDeletion({
      adminUserId: user.id,
      targetEntityType: 'listing',
      targetEntityId: listingId,
      actionDescription: `Deleted listing: ${beforeData?.name || `#${listingId}`}`,
      beforeData: beforeData ? { id: beforeData.id, name: beforeData.name, status: beforeData.status } : { id: listingId },
      severity: 'high',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        message: 'Listing deleted successfully',
        id: listingId
      }
    });
  } catch (error) {
    ErrorService.capture('Error deleting listing:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to delete listing' }
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/listings/[id]
 * Update a listing by ID (admin only)
 * @phase Phase 5 - Listing Editor Modal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: 'Authentication required' } },
      { status: 401 }
    );
  }

  if (user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: { message: 'Admin access required' } },
      { status: 403 }
    );
  }

  const listingId = parseInt(params.id);

  if (isNaN(listingId)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid listing ID' } },
      { status: 400 }
    );
  }

  try {
    const db = getDatabaseService();
    const body = await request.json();

    // Verify listing exists
    const existing = await db.query<{ id: number; name: string }>(
      'SELECT id, name FROM listings WHERE id = ?',
      [listingId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Listing not found' } },
        { status: 404 }
      );
    }

    // Check name uniqueness if name is being changed
    const existingRow = existing.rows[0];
    if (existingRow && body.name && body.name !== existingRow.name) {
      const duplicateName = await db.query<{ id: number }>(
        'SELECT id FROM listings WHERE name = ? AND id != ?',
        [body.name, listingId]
      );
      if (duplicateName.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: { message: 'A listing with this name already exists' } },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    const allowedFields = [
      'name', 'slug', 'type', 'tier', 'status', 'approved',
      'user_id', 'category_id', 'description',
      'address', 'city', 'state', 'zip_code', 'country',
      'email', 'phone', 'website',
      'contact_name', 'contact_email', 'contact_phone',
      'claimed', 'mock'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        // Handle boolean fields
        if (field === 'claimed' || field === 'mock') {
          values.push(body[field] ? 1 : 0);
        } else {
          values.push(body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'No fields to update' } },
        { status: 400 }
      );
    }

    // Always update last_update and updated_at
    updates.push('last_update = NOW()');
    updates.push('updated_at = NOW()');

    values.push(listingId);

    await db.query(
      `UPDATE listings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated listing
    const updatedListing = await db.query(
      'SELECT * FROM listings WHERE id = ?',
      [listingId]
    );

    // Log admin activity (non-blocking)
    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'listing',
      targetEntityId: listingId,
      actionType: 'listing_updated',
      actionCategory: 'update',
      actionDescription: `Updated listing: ${existingRow?.name || `#${listingId}`} (fields: ${Object.keys(body).join(', ')})`,
      beforeData: { id: existingRow?.id, name: existingRow?.name },
      afterData: body,
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        listing: updatedListing.rows[0],
        message: 'Listing updated successfully'
      }
    });
  } catch (error) {
    ErrorService.capture('Error updating listing:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to update listing' }
      },
      { status: 500 }
    );
  }
}
