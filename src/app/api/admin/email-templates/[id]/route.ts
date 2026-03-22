/**
 * Admin Email Template API Routes
 * GET /api/admin/email-templates/[id] - Get template by ID
 * PATCH /api/admin/email-templates/[id] - Update template
 * DELETE /api/admin/email-templates/[id] - Delete template
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

interface EmailTemplateRow {
  id: number;
  template_key: string;
  template_name: string;
  subject_template: string;
  body_template: string;
  available_variables: string | string[];
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (_context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const db = getDatabaseService();
    const results = await db.query<EmailTemplateRow>(
      'SELECT id, template_key, template_name, subject_template, body_template, available_variables, is_active, is_default, created_at, updated_at FROM email_templates WHERE id = ?',
      [id]
    );

    if (results.rows.length === 0) {
      throw BizError.notFound('Template not found');
    }

    const row = results.rows[0];
    if (!row) {
      throw BizError.notFound('Template not found');
    }
    const template = {
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
    };

    return createSuccessResponse({ template }, 200);
  })(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const body = await context.request.json();
    const { name, category, subject, body_html, body_text, available_variables, is_active } = body;

    const db = getDatabaseService();
    await db.query(
      `UPDATE email_templates SET
        template_key = ?, template_name = ?, subject_template = ?, body_template = ?,
        available_variables = ?, is_active = ?
       WHERE id = ?`,
      [
        category,
        name,
        subject,
        body_html || '',
        JSON.stringify(available_variables || []),
        is_active !== false,
        id
      ]
    );

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'email_template',
      targetEntityId: id,
      actionType: 'email_template_updated',
      actionCategory: 'configuration',
      actionDescription: `Updated email template #${id}`,
      afterData: { name, category, subject, is_active: is_active !== false },
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true }, 200);
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const db = getDatabaseService();
    await db.query('DELETE FROM email_templates WHERE id = ?', [id]);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'email_template',
      targetEntityId: id,
      actionType: 'email_template_deleted',
      actionCategory: 'configuration',
      actionDescription: `Deleted email template #${id}`,
      severity: 'high',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true }, 200);
  })(request);
}
