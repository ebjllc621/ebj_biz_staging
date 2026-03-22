/**
 * Admin Job Market Content API Route
 *
 * GET /api/admin/jobs/content - Get market content for management
 * POST /api/admin/jobs/content - Create new content
 * PUT /api/admin/jobs/content - Update content
 * DELETE /api/admin/jobs/content - Delete content
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/bigint';

/**
 * GET /api/admin/jobs/content
 * Get market content with filters
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const url = new URL(context.request.url);

  const contentType = url.searchParams.get('content_type');
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (contentType) {
    conditions.push('content_type = ?');
    params.push(contentType);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      jmc.*,
      u.email as author_email,
      COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as author_name
    FROM job_market_content jmc
    LEFT JOIN users u ON jmc.author_user_id = u.id
    ${whereClause}
    ORDER BY jmc.is_featured DESC, jmc.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const result = await db.query<{
    id: number;
    content_type: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string;
    data_json: string | null;
    cover_image_url: string | null;
    regions: string | null;
    job_categories: string | null;
    published_date: Date | null;
    status: string;
    author_user_id: number | null;
    view_count: number;
    is_featured: number;
    created_at: Date;
    updated_at: Date;
    author_email: string | null;
    author_name: string | null;
  }>(query, params);

  const items = result.rows.map(row => ({
    id: row.id,
    content_type: row.content_type,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    data_json: safeJsonParse(row.data_json, null),
    cover_image_url: row.cover_image_url,
    regions: safeJsonParse<string[] | null>(row.regions, null),
    job_categories: safeJsonParse<number[] | null>(row.job_categories, null),
    published_date: row.published_date ? new Date(row.published_date) : null,
    status: row.status,
    author_user_id: row.author_user_id,
    author_name: row.author_name,
    author_email: row.author_email,
    view_count: row.view_count,
    is_featured: Boolean(row.is_featured),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }));

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM job_market_content ${whereClause}`;
  const countParams = conditions.length > 0 ? params.slice(0, -2) : [];
  const countResult = await db.query<{ total: bigint }>(countQuery, countParams);
  const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

  return createSuccessResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }, context.requestId);
});

/**
 * POST /api/admin/jobs/content
 * Create new market content
 */
export const POST = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const authorId = parseInt(context.userId, 10);
  const body = await context.request.json() as {
    content_type: string;
    title: string;
    slug?: string;
    summary?: string;
    content: string;
    data_json?: Record<string, unknown>;
    cover_image_url?: string;
    regions?: string[];
    job_categories?: number[];
    is_featured?: boolean;
  };

  if (!body.content_type || !body.title || !body.content) {
    throw BizError.badRequest('content_type, title, and content are required');
  }

  // Generate slug if not provided
  const slug = body.slug || body.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now();

  const db = getDatabaseService();

  // Check for duplicate slug
  const slugCheck = await db.query<{ id: number }>(
    'SELECT id FROM job_market_content WHERE slug = ?',
    [slug]
  );

  if (slugCheck.rows.length > 0) {
    throw BizError.badRequest('Content with this slug already exists');
  }

  const query = `
    INSERT INTO job_market_content (
      content_type, title, slug, summary, content, data_json,
      cover_image_url, regions, job_categories, status,
      author_user_id, is_featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
  `;

  const insertResult = await db.query(query, [
    body.content_type,
    body.title,
    slug,
    body.summary || null,
    body.content,
    body.data_json ? JSON.stringify(body.data_json) : null,
    body.cover_image_url || null,
    body.regions ? JSON.stringify(body.regions) : null,
    body.job_categories ? JSON.stringify(body.job_categories) : null,
    authorId,
    body.is_featured ? 1 : 0
  ]);

  const insertId = bigIntToNumber(insertResult.insertId);

  // Fetch created content
  const created = await db.query<{ id: number; slug: string; status: string }>(
    'SELECT id, slug, status FROM job_market_content WHERE id = ?',
    [insertId]
  );

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!, 10),
    targetEntityType: 'job',
    targetEntityId: insertId,
    actionType: 'job_content_created',
    actionCategory: 'creation',
    actionDescription: `Created job market content "${body.title}" (${body.content_type})`,
    afterData: { id: insertId, title: body.title, content_type: body.content_type, slug },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'Content created successfully',
    content: created.rows[0]
  }, context.requestId);
});

/**
 * PUT /api/admin/jobs/content
 * Update market content
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const body = await context.request.json() as {
    id: number;
    title?: string;
    summary?: string;
    content?: string;
    data_json?: Record<string, unknown>;
    cover_image_url?: string;
    regions?: string[];
    job_categories?: number[];
    status?: string;
    is_featured?: boolean;
  };

  if (!body.id) {
    throw BizError.badRequest('id is required');
  }

  const db = getDatabaseService();

  // Verify content exists
  const existing = await db.query<{ id: number }>(
    'SELECT id FROM job_market_content WHERE id = ?',
    [body.id]
  );

  if (existing.rows.length === 0) {
    throw BizError.notFound('Content', String(body.id));
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    params.push(body.title);
  }
  if (body.summary !== undefined) {
    updates.push('summary = ?');
    params.push(body.summary);
  }
  if (body.content !== undefined) {
    updates.push('content = ?');
    params.push(body.content);
  }
  if (body.data_json !== undefined) {
    updates.push('data_json = ?');
    params.push(JSON.stringify(body.data_json));
  }
  if (body.cover_image_url !== undefined) {
    updates.push('cover_image_url = ?');
    params.push(body.cover_image_url);
  }
  if (body.regions !== undefined) {
    updates.push('regions = ?');
    params.push(JSON.stringify(body.regions));
  }
  if (body.job_categories !== undefined) {
    updates.push('job_categories = ?');
    params.push(JSON.stringify(body.job_categories));
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    params.push(body.status);
    if (body.status === 'published') {
      updates.push('published_date = NOW()');
    }
  }
  if (body.is_featured !== undefined) {
    updates.push('is_featured = ?');
    params.push(body.is_featured ? 1 : 0);
  }

  if (updates.length === 0) {
    throw BizError.badRequest('No fields to update');
  }

  updates.push('updated_at = NOW()');
  params.push(body.id);

  await db.query(
    `UPDATE job_market_content SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!, 10),
    targetEntityType: 'job',
    targetEntityId: body.id,
    actionType: 'job_content_updated',
    actionCategory: 'update',
    actionDescription: `Updated job market content ID ${body.id}`,
    afterData: { id: body.id, fields_updated: updates.filter(u => u !== 'updated_at = NOW()').map(u => u.split(' = ')[0]) },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'Content updated successfully'
  }, context.requestId);
});

/**
 * DELETE /api/admin/jobs/content
 * Delete market content
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw BizError.badRequest('id is required');
  }

  const db = getDatabaseService();

  // Verify content exists
  const existing = await db.query<{ id: number }>(
    'SELECT id FROM job_market_content WHERE id = ?',
    [parseInt(id, 10)]
  );

  if (existing.rows.length === 0) {
    throw BizError.notFound('Content', id);
  }

  await db.query('DELETE FROM job_market_content WHERE id = ?', [parseInt(id, 10)]);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: parseInt(context.userId!, 10),
    targetEntityType: 'job',
    targetEntityId: parseInt(id, 10),
    actionType: 'job_content_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted job market content ID ${id}`,
    severity: 'normal'
  });

  return createSuccessResponse({
    message: 'Content deleted successfully'
  }, context.requestId);
});
