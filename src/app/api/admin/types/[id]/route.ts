/**
 * Admin Type Detail API Routes
 * GET /api/admin/types/[id] - Get type by ID
 * PATCH /api/admin/types/[id] - Update type
 * DELETE /api/admin/types/[id] - Delete type
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
import { getAdminActivityService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

interface TypeRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Extract type ID from URL path
 */
function extractTypeId(url: URL): number {
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Type ID is required', {});
  }

  const typeId = parseInt(id, 10);

  if (isNaN(typeId)) {
    throw BizError.badRequest('Invalid type ID', { id });
  }

  return typeId;
}

/**
 * GET /api/admin/types/[id]
 * Get type by ID
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access type details', 'admin');
  }

  const url = new URL(request.url);
  const typeId = extractTypeId(url);

  const db = getDatabaseService();

  const result = await db.query<TypeRow>(
    'SELECT id, name, slug, description, created_at, updated_at FROM types WHERE id = ?',
    [typeId]
  );

  const type = result.rows?.[0];

  if (!type) {
    throw BizError.notFound('Type', typeId);
  }

  return createSuccessResponse({
    type: {
      id: type.id,
      name: type.name,
      slug: type.slug,
      description: type.description || '',
      created_at: type.created_at,
      updated_at: type.updated_at
    }
  });
});

/**
 * PATCH /api/admin/types/[id]
 * Update type
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('update types', 'admin');
  }

  const url = new URL(request.url);
  const typeId = extractTypeId(url);

  const body = await request.json();
  const { name, slug, description } = body;

  const db = getDatabaseService();

  // Check if type exists
  const existingResult = await db.query<TypeRow>(
    'SELECT id FROM types WHERE id = ?',
    [typeId]
  );

  if (!existingResult.rows || existingResult.rows.length === 0) {
    throw BizError.notFound('Type', typeId);
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }

  if (slug !== undefined) {
    // Check for duplicate slug (excluding current type)
    const slugCheckResult = await db.query<TypeRow>(
      'SELECT id FROM types WHERE slug = ? AND id != ?',
      [slug, typeId]
    );

    if (slugCheckResult.rows && slugCheckResult.rows.length > 0) {
      throw BizError.badRequest('A type with this slug already exists', { slug });
    }

    updates.push('slug = ?');
    params.push(slug);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (updates.length === 0) {
    throw BizError.badRequest('No fields to update', {});
  }

  // Add updated_at
  updates.push('updated_at = NOW()');
  params.push(typeId);

  await db.query(
    `UPDATE types SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Fetch updated type
  const updatedResult = await db.query<TypeRow>(
    'SELECT id, name, slug, description, created_at, updated_at FROM types WHERE id = ?',
    [typeId]
  );

  const updatedType = updatedResult.rows?.[0];

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: 'type',
    targetEntityId: typeId,
    actionType: 'type_updated',
    actionCategory: 'update',
    actionDescription: `Updated type #${typeId}`,
    afterData: { name, slug, description },
    severity: 'normal',
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    sessionId: request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({
    type: updatedType,
    message: 'Type updated successfully'
  });
}));

/**
 * DELETE /api/admin/types/[id]
 * Delete type with admin activity logging
 */
export const DELETE = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('delete types', 'admin');
  }

  const url = new URL(request.url);
  const typeId = extractTypeId(url);

  const db = getDatabaseService();

  // AUDIT: Capture full type data BEFORE deletion
  const existingResult = await db.query<TypeRow>(
    'SELECT id, name, slug, description, created_at, updated_at FROM types WHERE id = ?',
    [typeId]
  );

  const existingType = existingResult.rows?.[0];

  if (!existingType) {
    throw BizError.notFound('Type', typeId);
  }

  // Capture before data for audit
  const beforeData = {
    id: existingType.id,
    name: existingType.name,
    slug: existingType.slug,
    description: existingType.description,
    created_at: existingType.created_at,
    updated_at: existingType.updated_at
  };

  const typeName = existingType.name;

  // Delete the type
  await db.query('DELETE FROM types WHERE id = ?', [typeId]);

  // AUDIT: Log to admin_activity (non-blocking)
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logDeletion({
    adminUserId: user.id,
    targetEntityType: 'type',
    targetEntityId: typeId,
    actionDescription: `Deleted type: ${typeName}`,
    beforeData,
    afterData: { deleted: true },
    ipAddress: request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    sessionId: request.cookies.get('bk_session')?.value
  });

  return createSuccessResponse({
    message: `Type "${typeName}" deleted successfully`
  });
}));
