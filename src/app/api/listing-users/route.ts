/**
 * API Route: /api/listing-users
 * Handles listing_users table operations for multi-user listing permissions
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Database: listing_users table (PHASE_6_001_create_listing_users.sql)
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

interface CreateListingUserRequest {
  listing_id: number;
  role: string;
  status?: string;
}

/**
 * POST /api/listing-users
 * Create a new listing_user entry
 */
export const POST = apiHandler(
  async (context: ApiContext) => {
    const { request } = context;
    const db = getDatabaseService();

    // Parse request body
    const body = (await request.json()) as CreateListingUserRequest;
    const { listing_id, role, status = 'active' } = body;

    // Validation
    if (!listing_id) {
      throw BizError.badRequest('listing_id is required');
    }

    if (!role) {
      throw BizError.badRequest('role is required');
    }

    // Validate role enum
    const validRoles = ['owner', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      throw BizError.badRequest('Invalid role. Must be: owner, manager, or user');
    }

    // Get current user from session
    const user = await getUserFromRequest(request as NextRequest);
    if (!user) {
      throw BizError.unauthorized('Authentication required');
    }

    // Check if entry already exists
    const existingEntry = await db.query<{ id: number }>(
      'SELECT id FROM listing_users WHERE listing_id = ? AND user_id = ?',
      [listing_id, user.id]
    );

    if (existingEntry.rows.length > 0) {
      throw BizError.badRequest('User already has a role for this listing');
    }

    // Insert new listing_user entry
    const result = await db.query(
      `INSERT INTO listing_users
       (listing_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [listing_id, user.id, role, status]
    );

    return createSuccessResponse({
      id: result.insertId ?? 0,
      listing_id: Number(listing_id),
      user_id: user.id,
      role: role as string,
      status: status as string,
    });
  },
  {
    requireAuth: true,
    allowedMethods: ['POST'],
  }
);

interface ListingUser {
  id: number;
  listing_id: number;
  user_id: number;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

/**
 * GET /api/listing-users?listing_id={id}
 * Get all users for a listing
 */
export const GET = apiHandler(
  async (context: ApiContext) => {
    const { request } = context;
    const db = getDatabaseService();
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');

    if (!listingId) {
      throw BizError.badRequest('listing_id query parameter is required');
    }

    // Get all users for the listing
    const result = await db.query<ListingUser>(
      `SELECT
        lu.id,
        lu.listing_id,
        lu.user_id,
        lu.role,
        lu.status,
        lu.created_at,
        lu.updated_at,
        u.username,
        u.email,
        u.first_name,
        u.last_name
       FROM listing_users lu
       JOIN users u ON lu.user_id = u.id
       WHERE lu.listing_id = ?
       ORDER BY
         CASE lu.role
           WHEN 'owner' THEN 1
           WHEN 'manager' THEN 2
           WHEN 'user' THEN 3
         END,
         lu.created_at ASC`,
      [parseInt(listingId, 10)]
    );

    return createSuccessResponse({ users: result.rows });
  },
  {
    requireAuth: true,
    allowedMethods: ['GET'],
  }
);
