/**
 * Export Categories API Endpoint
 *
 * GET /api/admin/categories/export
 * - format: 'json' | 'csv' | 'sql'
 * - ids: comma-separated category IDs (optional)
 * - includeInactive: 'true' | 'false' (default: true)
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */

import { NextResponse } from 'next/server';
import { apiHandler } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getCategoryService } from '@core/services/CategoryService';
import { generateJSONExport } from '@core/utils/export/jsonExport';
import { generateCSVExport } from '@core/utils/export/csvExport';
import { generateSQLExport } from '@core/utils/export/sqlExport';
import { flattenCategoryTree } from '@core/utils/category';

export const GET = apiHandler(async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // Parse query parameters
  const format = url.searchParams.get('format') as 'json' | 'csv' | 'sql' | null;
  const idsParam = url.searchParams.get('ids');
  const includeInactive = url.searchParams.get('includeInactive') !== 'false';

  // Validate format
  if (!format || !['json', 'csv', 'sql'].includes(format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  // Parse category IDs
  const ids = idsParam
    ? idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
    : undefined;

  // Get CategoryService
  const service = getCategoryService();

  // Export categories
  const categories = await service.exportCategories(ids, {
    includeInactive,
    hierarchical: format === 'json' // Only JSON supports hierarchical
  });

  // Generate export content based on format
  let content: string;
  let contentType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = generateJSONExport(categories as never, true);
      contentType = 'application/json';
      extension = 'json';
      break;

    case 'csv':
      // CSV requires flat structure
      const flatCategories = flattenCategoryTree(categories as never);
      content = generateCSVExport(flatCategories as never);
      contentType = 'text/csv; charset=utf-8';
      extension = 'csv';
      break;

    case 'sql':
      // SQL requires flat structure
      const flatForSQL = flattenCategoryTree(categories as never);
      content = generateSQLExport(flatForSQL as never, 'categories');
      contentType = 'text/plain; charset=utf-8';
      extension = 'sql';
      break;

    default:
      throw BizError.badRequest('Unsupported format');
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `categories-export-${timestamp}.${extension}`;

  // Return file content with download headers
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
