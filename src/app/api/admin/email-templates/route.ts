/**
 * Admin Email Templates API Routes
 * GET /api/admin/email-templates - Get all email templates
 * POST /api/admin/email-templates - Create email template
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.5
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

async function handleGet(_context: ApiContext) {
  const db = getDatabaseService();
  const results = await db.query(
    'SELECT id, template_key, template_name, subject_template, body_template, available_variables, is_active, is_default, created_at, updated_at FROM email_templates ORDER BY template_key, template_name'
  );

  const templates = results.rows.map((row: any) => ({
    id: row.id,
    name: row.template_name,
    category: row.template_key,
    subject: row.subject_template,
    body_html: row.body_template,
    body_text: '',
    available_variables: typeof row.available_variables === 'string'
      ? JSON.parse(row.available_variables)
      : (row.available_variables || []),
    is_active: row.is_active,
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  return createSuccessResponse({ templates });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true
,
  rbac: {
    action: 'read',
    resource: 'email_templates'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

async function handlePost(context: ApiContext) {
// TODO: Admin auth

    const body = await context.request.json();
    const { name, category, subject, body_html, body_text, available_variables, is_active } = body;

    if (!name || !subject) {
      throw BizError.badRequest('Name and subject are required');
    }

    const db = getDatabaseService();
    const result = await db.query(
      `INSERT INTO email_templates (template_key, template_name, subject_template, body_template, available_variables, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category,
        name,
        subject,
        body_html || '',
        JSON.stringify(available_variables || []),
        is_active !== false
      ]
    );

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'email_template',
      targetEntityId: Number(result.insertId) || null,
      actionType: 'email_template_created',
      actionCategory: 'configuration',
      actionDescription: `Created email template: ${name}`,
      afterData: { name, category, subject, is_active: is_active !== false },
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ id: result.insertId });
}

// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(handlePost, {
  allowedMethods: ['POST'],
  requireAuth: true
,
  rbac: {
    action: 'create',
    resource: 'email_templates'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
}));
