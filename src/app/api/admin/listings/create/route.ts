/**
 * Admin Listing Create API
 * POST /api/admin/listings/create - Create new listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - CSRF protection: via apiHandler withCsrf
 * - Authentication: Admin-only access
 * - Service boundary: Uses direct DB for admin operations
 * - Activity logging: AdminActivityService for audit trail
 *
 * DATABASE SCHEMA (verified Phase 0):
 * - tier: enum('essentials','plus','preferred','premium')
 * - status: enum('active','inactive','pending','suspended')
 * - approved: enum('pending','approved','rejected')
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @phase Phase 5 - Listing Editor Modal
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { NextRequest } from 'next/server';

interface CreateListingRequest {
  name: string;
  slug?: string;
  type: string;
  tier?: 'essentials' | 'plus' | 'preferred' | 'premium';
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  approved?: 'pending' | 'approved' | 'rejected';
  user_id?: number | null;
  category_id?: number | null;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  claimed?: boolean;
  mock?: boolean;
}

export const POST = apiHandler(
  async (context: ApiContext) => {
    const { request, logger } = context;

    // Get current admin user
    const currentUser = await getUserFromRequest(request as NextRequest);
    if (!currentUser) {
      throw BizError.unauthorized('Authentication required');
    }
    if (currentUser.role !== 'admin') {
      throw BizError.forbidden('Admin access required');
    }

    // Parse request body
    const body = (await request.json()) as CreateListingRequest;
    const { name, type } = body;

    // Validate required fields
    if (!name?.trim()) {
      throw BizError.validation('name', name, 'Listing name is required');
    }
    if (!type?.trim()) {
      throw BizError.validation('type', type, 'Listing type is required');
    }

    const db = getDatabaseService();

    // Generate slug if not provided
    let slug = body.slug?.trim();
    if (!slug) {
      slug = name.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Check for duplicate name
    const existingName = await db.query<{ id: number }>(
      'SELECT id FROM listings WHERE name = ?',
      [name]
    );
    if (existingName.rows.length > 0) {
      throw BizError.validation('name', name, 'A listing with this name already exists');
    }

    // Check for duplicate slug and make unique if needed
    let uniqueSlug = slug;
    let counter = 1;
    while (true) {
      const existingSlug = await db.query<{ id: number }>(
        'SELECT id FROM listings WHERE slug = ?',
        [uniqueSlug]
      );
      if (existingSlug.rows.length === 0) break;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
      if (counter > 100) {
        throw BizError.validation('slug', slug, 'Unable to generate unique slug');
      }
    }

    // Insert new listing
    const result = await db.query(
      `INSERT INTO listings (
        name, slug, type, tier, status, approved,
        user_id, category_id, description,
        address, city, state, zip_code, country,
        email, phone, website,
        contact_name, contact_email, contact_phone,
        claimed, mock, created_at, updated_at, date_created, last_update
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())`,
      [
        name,
        uniqueSlug,
        type,
        body.tier || 'essentials',
        body.status || 'pending',
        body.approved || 'pending',
        body.user_id || null,
        body.category_id || null,
        body.description || null,
        body.address || null,
        body.city || null,
        body.state || null,
        body.zip_code || null,
        body.country || 'US',
        body.email || null,
        body.phone || null,
        body.website || null,
        body.contact_name || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.claimed ? 1 : 0,
        body.mock ? 1 : 0
      ]
    );

    const newListingId = result.insertId;

    if (!newListingId) {
      throw BizError.databaseError('listing creation', new Error('No insert ID returned'));
    }

    // Log activity
    const activityService = getActivityLoggingService();
    await activityService.logActivity({
      userId: currentUser.id,
      action: 'listing_created',
      actionType: 'account',
      description: `Created new listing: ${name}`,
      entityType: 'listing',
      entityId: newListingId.toString(),
      success: true,
      metadata: {
        listing_name: name,
        listing_tier: body.tier || 'essentials'
      }
    });

    // Log to AdminActivityService for admin audit trail
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'listing',
      targetEntityId: Number(newListingId),
      actionType: 'listing_created',
      actionCategory: 'creation',
      actionDescription: `Created listing: ${name}`,
      afterData: { name, tier: body.tier || 'essentials', status: body.status || 'pending', slug: uniqueSlug, type },
      severity: 'normal'
    });

    logger.info('Listing created successfully', {
      operation: 'create-listing',
      metadata: { newListingId, name }
    });

    // Fetch created listing for response
    const createdListing = await db.query(
      'SELECT * FROM listings WHERE id = ?',
      [newListingId]
    );

    return createSuccessResponse({
      listing: createdListing.rows[0],
      message: 'Listing created successfully'
    });
  },
  {
    allowedMethods: ['POST'],
    requireAuth: true
  }
);
