/**
 * Admin Hiring Campaigns API Route
 *
 * GET /api/admin/jobs/campaigns - Get campaigns pending approval
 * PUT /api/admin/jobs/campaigns - Approve/reject campaign
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
 * GET /api/admin/jobs/campaigns
 * Get campaigns for admin management (with filters)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  // TODO: Add admin role check when role system is integrated
  const db = getDatabaseService();
  const url = new URL(context.request.url);

  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    conditions.push('hc.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      hc.*,
      l.name as listing_name,
      u.email as approved_by_email
    FROM hiring_campaigns hc
    INNER JOIN listings l ON hc.listing_id = l.id
    LEFT JOIN users u ON hc.approved_by_user_id = u.id
    ${whereClause}
    ORDER BY
      CASE hc.status
        WHEN 'pending_approval' THEN 1
        WHEN 'active' THEN 2
        ELSE 3
      END,
      hc.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const result = await db.query<{
    id: number;
    listing_id: number;
    campaign_name: string;
    campaign_type: string;
    hiring_goal: number | null;
    target_roles: string | null;
    target_categories: string | null;
    season: string | null;
    start_date: Date;
    end_date: Date;
    budget: number | null;
    status: string;
    approved_by_user_id: number | null;
    approved_at: Date | null;
    performance_metrics: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
    listing_name: string;
    approved_by_email: string | null;
  }>(query, params);

  const campaigns = result.rows.map(row => ({
    id: row.id,
    listing_id: row.listing_id,
    listing_name: row.listing_name,
    campaign_name: row.campaign_name,
    campaign_type: row.campaign_type,
    hiring_goal: row.hiring_goal,
    target_roles: safeJsonParse<string[] | null>(row.target_roles, null),
    target_categories: safeJsonParse<number[] | null>(row.target_categories, null),
    season: row.season,
    start_date: new Date(row.start_date),
    end_date: new Date(row.end_date),
    budget: row.budget,
    status: row.status,
    approved_by_user_id: row.approved_by_user_id,
    approved_by_email: row.approved_by_email,
    approved_at: row.approved_at ? new Date(row.approved_at) : null,
    performance_metrics: safeJsonParse(row.performance_metrics, null),
    notes: row.notes,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  }));

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM hiring_campaigns hc ${whereClause}`;
  const countParams = conditions.length > 0 ? params.slice(0, -2) : [];
  const countResult = await db.query<{ total: bigint }>(countQuery, countParams);
  const total = bigIntToNumber(countResult.rows[0]?.total || 0n);

  return createSuccessResponse({
    campaigns,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }, context.requestId);
});

/**
 * PUT /api/admin/jobs/campaigns
 * Approve or reject a campaign
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const adminUserId = parseInt(context.userId, 10);
  // TODO: Add admin role check when role system is integrated

  const body = await context.request.json() as {
    campaign_id: number;
    action: 'approve' | 'reject';
    notes?: string;
  };

  if (!body.campaign_id || !body.action) {
    throw BizError.badRequest('campaign_id and action are required');
  }

  if (!['approve', 'reject'].includes(body.action)) {
    throw BizError.badRequest('action must be "approve" or "reject"');
  }

  const db = getDatabaseService();

  // Verify campaign exists and is pending
  const campaignResult = await db.query<{ id: number; status: string }>(
    'SELECT id, status FROM hiring_campaigns WHERE id = ?',
    [body.campaign_id]
  );

  if (campaignResult.rows.length === 0) {
    throw BizError.notFound('Campaign', String(body.campaign_id));
  }

  const campaign = campaignResult.rows[0]!;
  if (campaign.status !== 'pending_approval') {
    throw BizError.badRequest('Campaign is not pending approval');
  }

  // Update campaign status
  const newStatus = body.action === 'approve' ? 'approved' : 'draft';
  const updateQuery = `
    UPDATE hiring_campaigns
    SET
      status = ?,
      approved_by_user_id = ?,
      approved_at = ${body.action === 'approve' ? 'NOW()' : 'NULL'},
      notes = COALESCE(?, notes),
      updated_at = NOW()
    WHERE id = ?
  `;

  await db.query(updateQuery, [
    newStatus,
    body.action === 'approve' ? adminUserId : null,
    body.notes || null,
    body.campaign_id
  ]);

  // Fetch updated campaign
  const updatedResult = await db.query<{
    id: number;
    status: string;
    approved_by_user_id: number | null;
    approved_at: Date | null;
    notes: string | null;
  }>('SELECT id, status, approved_by_user_id, approved_at, notes FROM hiring_campaigns WHERE id = ?', [body.campaign_id]);

  const updated = updatedResult.rows[0];

  if (!updated) {
    throw BizError.internalServerError('campaign_update', new Error('Failed to fetch updated campaign'));
  }

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: adminUserId,
    targetEntityType: 'job',
    targetEntityId: body.campaign_id,
    actionType: 'job_campaign_updated',
    actionCategory: 'update',
    actionDescription: `${body.action === 'approve' ? 'Approved' : 'Rejected'} hiring campaign ID ${body.campaign_id}`,
    afterData: { campaign_id: body.campaign_id, action: body.action, new_status: newStatus },
    severity: 'normal'
  });

  return createSuccessResponse({
    message: `Campaign ${body.action === 'approve' ? 'approved' : 'rejected'} successfully`,
    campaign: {
      id: updated.id,
      status: updated.status,
      approved_by_user_id: updated.approved_by_user_id,
      approved_at: updated.approved_at ? new Date(updated.approved_at) : null,
      notes: updated.notes
    }
  }, context.requestId);
});
