/**
 * User Import Preview API Endpoint
 *
 * POST /api/admin/users/import/preview
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Admin-only access
 * - PII validation
 *
 * @tier ADVANCED
 * @phase Phase 6 - User Import/Export
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { parseUserJSONImport, parseUserCSVImport, parseUserSQLImport } from '@core/utils/import/userImport';
import { validateUserImport } from '@core/utils/import/userValidation';
import type { ImportUserInput, UserImportPreviewResult, UserImportConflict, ImportError } from '@core/types/import-export';

interface ImportPreviewRequest {
  format: 'json' | 'csv' | 'sql';
  content: string;
}

export const POST = apiHandler(async (context) => {
  const body = await context.request.json() as ImportPreviewRequest;

  // Validate request
  if (!body.format || !['json', 'csv', 'sql'].includes(body.format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  if (!body.content || typeof body.content !== 'string') {
    throw BizError.badRequest('Content is required');
  }

  // Check file size (10MB limit)
  const contentSize = new Blob([body.content]).size;
  if (contentSize > 10 * 1024 * 1024) {
    throw BizError.badRequest('File too large. Maximum size is 10MB.', { size: contentSize });
  }

  // Parse content based on format
  let users: ImportUserInput[];

  try {
    switch (body.format) {
      case 'json':
        users = parseUserJSONImport(body.content);
        break;

      case 'csv':
        users = parseUserCSVImport(body.content);
        break;

      case 'sql':
        users = parseUserSQLImport(body.content);
        break;

      default:
        throw BizError.badRequest('Unsupported format');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw BizError.badRequest(`Failed to parse ${body.format.toUpperCase()}: ${errorMessage}`);
  }

  // Validate import data
  const validationErrors = validateUserImport(users);

  // Detect email conflicts with existing users
  const db = getDatabaseService();
  const emails = users.map(u => u.email.toLowerCase()).filter(e => e);

  const conflicts: UserImportConflict[] = [];

  if (emails.length > 0) {
    const placeholders = emails.map(() => '?').join(',');
    const existingUsers = await db.query<{ id: number; email: string; username: string }>(
      `SELECT id, email, username FROM users WHERE LOWER(email) IN (${placeholders})`,
      emails
    );

    existingUsers.rows.forEach(existing => {
      if (!existing) return;

      const importIndex = users.findIndex(u => u.email.toLowerCase() === existing.email.toLowerCase());
      if (importIndex !== -1) {
        const importUser = users[importIndex];
        if (!importUser) return;

        conflicts.push({
          email: existing.email,
          existingId: existing.id,
          existingUsername: existing.username,
          importUsername: importUser.username || '',
          importRow: importIndex + 1
        });
      }
    });
  }

  // Build preview result
  const preview: UserImportPreviewResult = {
    total: users.length,
    valid: users.length - validationErrors.length - conflicts.length,
    conflicts,
    errors: validationErrors,
    preview: users.slice(0, 100) // First 100 rows
  };

  return createSuccessResponse(preview);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
