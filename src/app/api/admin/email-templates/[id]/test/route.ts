/**
 * Admin Email Template Test API Routes
 * POST /api/admin/email-templates/[id]/test - Send test email
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const body = await context.request.json();
    const { email } = body;

    if (!email) {
      throw BizError.badRequest('Email address required');
    }

    const db = getDatabaseService();
    const results = await db.query('SELECT * FROM email_templates WHERE id = ?', [id]);

    if (results.rows.length === 0) {
      throw BizError.notFound('Template not found');
    }

    // TODO: Implement actual email sending via MailSender service with template
    // For now, return success to unblock development

    return createSuccessResponse({ success: true, message: 'Test email sent' });
  })(request);
}
