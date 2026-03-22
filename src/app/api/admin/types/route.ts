/**
 * Admin Types API Routes
 * GET /api/admin/types - List all types with pagination
 * POST /api/admin/types - Create a new type
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 * - Cookie name: bk_session (canonical)
 *
 * @authority CLAUDE.md - API Standards
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';

interface TypeRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TypeCountRow {
  count: bigint;
}

/**
 * GET /api/admin/types
 * Get all types with pagination and optional search
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access types management', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  // Parse search
  const searchQuery = searchParams.get('q') || '';

  const db = getDatabaseService();

  // Build query with optional search
  let whereClause = '';
  const params: (string | number)[] = [];

  if (searchQuery) {
    whereClause = 'WHERE name LIKE ? OR slug LIKE ? OR description LIKE ?';
    const searchPattern = `%${searchQuery}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Get total count
  const countResult = await db.query<TypeCountRow>(
    `SELECT COUNT(*) as count FROM types ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows?.[0]?.count ?? 0n);

  // Get paginated types
  const typesResult = await db.query<TypeRow>(
    `SELECT id, name, slug, description, created_at, updated_at
     FROM types
     ${whereClause}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const types = (typesResult.rows || []).map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  // Get statistics
  const statsResult = await db.query<TypeCountRow>(
    'SELECT COUNT(*) as count FROM types'
  );
  const totalTypes = bigIntToNumber(statsResult.rows?.[0]?.count ?? 0n);

  return createSuccessResponse({
    items: types,
    pagination: {
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    },
    stats: {
      totalTypes
    }
  });
});

/**
 * POST /api/admin/types
 * Create a new type
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('create types', 'admin');
  }

  const body = await request.json();
  const { name, slug, description } = body;

  if (!name || typeof name !== 'string') {
    throw BizError.badRequest('Name is required', { name });
  }

  // Generate slug if not provided
  const typeSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const db = getDatabaseService();

  // Check for duplicate slug
  const existingResult = await db.query<TypeRow>(
    'SELECT id FROM types WHERE slug = ?',
    [typeSlug]
  );

  if (existingResult.rows && existingResult.rows.length > 0) {
    throw BizError.badRequest('A type with this slug already exists', { slug: typeSlug });
  }

  // Insert new type
  const insertResult = await db.query(
    `INSERT INTO types (name, slug, description, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())`,
    [name, typeSlug, description || '']
  );

  const insertId = Number(insertResult.insertId);

  // Fetch the created type
  const newTypeResult = await db.query<TypeRow>(
    'SELECT id, name, slug, description, created_at, updated_at FROM types WHERE id = ?',
    [insertId]
  );

  const newType = newTypeResult.rows?.[0];

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: 'type',
    targetEntityId: insertId,
    actionType: 'type_created',
    actionCategory: 'creation',
    actionDescription: `Created type: ${name} (${typeSlug})`,
    afterData: { name, slug: typeSlug, description },
    severity: 'normal',
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    sessionId: request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({
    type: newType,
    message: 'Type created successfully'
  }, 201);
}));
