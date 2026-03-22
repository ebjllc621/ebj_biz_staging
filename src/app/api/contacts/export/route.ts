/**
 * Contact Export API Route
 * GET /api/contacts/export - Export contacts to CSV or vCard
 *
 * @tier SIMPLE
 * @authority Phase D Brain Plan
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { ExportField, ExportOptions, ContactFilters } from '@features/contacts/types';

const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  'name', 'email', 'phone', 'company', 'notes', 'tags',
  'category', 'priority', 'source', 'connected_since'
];

/**
 * GET /api/contacts/export
 * Export contacts to CSV or vCard format
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const url = new URL(context.request.url);
  const format = (url.searchParams.get('format') || 'csv') as 'csv' | 'vcf';
  const fieldsParam = url.searchParams.get('fields');
  const contactIdsParam = url.searchParams.get('contactIds');
  const category = url.searchParams.get('category');
  const starred = url.searchParams.get('starred');
  const source = url.searchParams.get('source');

  // Parse fields
  const includeFields: ExportField[] = fieldsParam
    ? fieldsParam.split(',') as ExportField[]
    : DEFAULT_EXPORT_FIELDS;

  // Parse contact IDs
  const contactIds = contactIdsParam
    ? contactIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id))
    : undefined;

  // Build filters
  const filters: ContactFilters = {};
  if (category) filters.category = category as ContactFilters['category'];
  if (starred === 'true') filters.isStarred = true;
  if (source) filters.source = source as ContactFilters['source'];

  const options: ExportOptions = {
    format,
    includeFields,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    contactIds
  };

  // Generate export content
  let content: string;
  let mimeType: string;
  let filename: string;

  if (format === 'vcf') {
    content = await service.exportContactsVCard(userId, options);
    mimeType = 'text/vcard';
    filename = `contacts-export-${new Date().toISOString().split('T')[0]}.vcf`;
  } else {
    content = await service.exportContactsCSV(userId, options);
    mimeType = 'text/csv';
    filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`;
  }

  // Return as downloadable file
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': `${mimeType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Request-Id': context.requestId
    }
  });
}, {
  requireAuth: true
});
