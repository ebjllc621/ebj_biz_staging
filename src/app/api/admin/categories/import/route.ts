/**
 * Import Execution API Endpoint
 *
 * POST /api/admin/categories/import
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 * - conflictResolution: 'skip' | 'overwrite' | 'rename'
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getCategoryService } from '@core/services/CategoryService';
import { getAdminActivityService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { parseJSONImport } from '@core/utils/import/jsonImport';
import { parseCSVImport } from '@core/utils/import/csvImport';
import { parseSQLImport } from '@core/utils/import/sqlImport';
import type { ImportCategoryInput, ImportResult, ConflictResolution } from '@core/types/import-export';

interface ImportExecuteRequest {
  format: 'json' | 'csv' | 'sql';
  content: string;
  conflictResolution: ConflictResolution;
}

export const POST = apiHandler(async (context) => {
  const body = await context.request.json() as ImportExecuteRequest;

  // Validate request
  if (!body.format || !['json', 'csv', 'sql'].includes(body.format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  if (!body.content || typeof body.content !== 'string') {
    throw BizError.badRequest('Content is required');
  }

  // Categories only support skip, overwrite, rename (not update_existing)
  const validCategoryResolutions = ['skip', 'overwrite', 'rename'] as const;
  if (!body.conflictResolution || !validCategoryResolutions.includes(body.conflictResolution as typeof validCategoryResolutions[number])) {
    throw BizError.badRequest('Invalid conflict resolution. Must be skip, overwrite, or rename');
  }
  // Type narrowing after validation
  const categoryConflictResolution = body.conflictResolution as 'skip' | 'overwrite' | 'rename';

  // Check file size (10MB limit)
  const contentSize = new Blob([body.content]).size;
  if (contentSize > 10 * 1024 * 1024) {
    throw BizError.badRequest('File too large. Maximum size is 10MB.', { size: contentSize });
  }

  // Parse content based on format
  let categories: ImportCategoryInput[];

  try {
    switch (body.format) {
      case 'json':
        categories = parseJSONImport(body.content);
        break;

      case 'csv':
        categories = parseCSVImport(body.content);
        break;

      case 'sql':
        categories = parseSQLImport(body.content);
        break;

      default:
        throw BizError.badRequest('Unsupported format');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw BizError.badRequest(`Failed to parse ${body.format.toUpperCase()}: ${errorMessage}`);
  }

  // Execute import
  const service = getCategoryService();
  const result = await service.importCategories(
    categories,
    categoryConflictResolution
  );

  // AUDIT: Log to admin_activity (non-blocking)
  const currentUser = await getUserFromRequest(context.request);
  if (currentUser) {
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: currentUser.id,
      targetEntityType: 'category',
      targetEntityId: null,
      actionType: 'categories_imported',
      actionCategory: 'import',
      actionDescription: `Imported categories from ${body.format.toUpperCase()} (${categories.length} entries, conflict: ${categoryConflictResolution})`,
      afterData: { format: body.format, conflictResolution: categoryConflictResolution, result },
      severity: 'normal'
    });
  }

  return createSuccessResponse(result as ImportResult);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
