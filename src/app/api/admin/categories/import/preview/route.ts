/**
 * Import Preview API Endpoint
 *
 * POST /api/admin/categories/import/preview
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getCategoryService } from '@core/services/CategoryService';
import { parseJSONImport } from '@core/utils/import/jsonImport';
import { parseCSVImport } from '@core/utils/import/csvImport';
import { parseSQLImport } from '@core/utils/import/sqlImport';
import { validateCategoryImport } from '@core/utils/import/validation';
import type { ImportCategoryInput, ImportPreviewResult } from '@core/types/import-export';

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

  // Validate import data
  const validationErrors = validateCategoryImport(categories);

  // Get CategoryService to detect conflicts
  const service = getCategoryService();
  const validationResult = await service.validateImport(categories);

  // Build preview result
  const preview: ImportPreviewResult = {
    total: validationResult.total,
    valid: validationResult.valid - validationErrors.length,
    conflicts: validationResult.conflicts,
    errors: [...validationErrors, ...validationResult.errors],
    preview: categories.slice(0, 100) // First 100 rows
  };

  return createSuccessResponse(preview);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
