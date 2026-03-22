/**
 * Contact Import Preview API Route
 * POST /api/contacts/import/preview - Preview CSV or VCF import without saving
 *
 * @tier SIMPLE
 * @authority Phase D Brain Plan
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { ImportRowData } from '@features/contacts/types';

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Parse VCF (vCard) content into ImportRowData array
 * Supports vCard 2.1, 3.0, and 4.0 formats
 */
function parseVCard(content: string): ImportRowData[] {
  const contacts: ImportRowData[] = [];
  // Split on BEGIN:VCARD to handle multiple vCards in one file
  const vcards = content.split(/(?=BEGIN:VCARD)/i);

  for (const vcard of vcards) {
    if (!vcard.trim().toUpperCase().startsWith('BEGIN:VCARD')) continue;

    const contact: ImportRowData = { name: '' };
    const lines = vcard.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      // Handle line folding (continuation lines starting with space/tab)
      let fullLine = line;
      while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1] || '')) {
        i++;
        fullLine += (lines[i] || '').substring(1);
      }

      // Extract field name and value (handle TYPE parameters)
      const colonIndex = fullLine.indexOf(':');
      if (colonIndex === -1) continue;

      const fieldPart = fullLine.substring(0, colonIndex).toUpperCase();
      const value = fullLine.substring(colonIndex + 1).trim();
      const fieldName = fieldPart.split(';')[0]; // Remove TYPE= params

      switch (fieldName) {
        case 'FN':
          // Full Name - preferred
          contact.name = value;
          break;
        case 'N':
          // Structured Name: Last;First;Middle;Prefix;Suffix
          // Only use if FN not set
          if (!contact.name) {
            const parts = value.split(';');
            const lastName = parts[0] || '';
            const firstName = parts[1] || '';
            contact.name = `${firstName} ${lastName}`.trim();
          }
          break;
        case 'EMAIL':
          // Take first email if multiple
          if (!contact.email) {
            contact.email = value;
          }
          break;
        case 'TEL':
          // Take first phone if multiple
          if (!contact.phone) {
            contact.phone = value;
          }
          break;
        case 'ORG':
          contact.company = value.split(';')[0]; // First part is company name
          break;
        case 'NOTE':
          contact.notes = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          break;
        case 'CATEGORIES':
          // vCard categories can map to tags
          contact.tags = value;
          break;
      }
    }

    // Only add contacts with a name
    if (contact.name?.trim()) {
      contacts.push(contact);
    }
  }

  return contacts;
}

/**
 * Detect file type from filename and MIME type
 */
function detectFileType(filename: string, mimeType: string): 'csv' | 'vcf' | null {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerName.endsWith('.vcf') || lowerMime === 'text/vcard' || lowerMime === 'text/x-vcard') {
    return 'vcf';
  }
  if (lowerName.endsWith('.csv') || lowerMime === 'text/csv' || lowerMime === 'application/csv') {
    return 'csv';
  }
  return null;
}

/**
 * POST /api/contacts/import/preview
 * Parse and validate CSV or VCF file, return preview
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  // Parse multipart form data
  const formData = await context.request.formData();
  const file = formData.get('file') as File;
  const columnMapping = formData.get('columnMapping');

  if (!file) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_FILE', message: 'No file provided' }),
      context.requestId
    );
  }

  // Detect file type
  const fileType = detectFileType(file.name, file.type);

  if (!fileType) {
    return createErrorResponse(
      new BizError({ code: 'INVALID_FILE_TYPE', message: 'Only CSV and VCF (vCard) files are supported' }),
      context.requestId
    );
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return createErrorResponse(
      new BizError({ code: 'FILE_TOO_LARGE', message: 'File size must be under 5MB' }),
      context.requestId
    );
  }

  // Read file content
  const content = await file.text();

  let parsedRows: ImportRowData[];
  let headers: string[] = [];
  let mapping: Record<string, number | null> = {
    name: null,
    email: null,
    phone: null,
    company: null,
    notes: null,
    tags: null,
    category: null
  };

  if (fileType === 'vcf') {
    // Parse VCF file directly
    parsedRows = parseVCard(content);

    if (parsedRows.length === 0) {
      return createErrorResponse(
        new BizError({ code: 'INVALID_VCF', message: 'No valid contacts found in VCF file' }),
        context.requestId
      );
    }

    // VCF files have fixed field mapping - no column selection needed
    // Headers are informational only for the frontend
    headers = ['name', 'email', 'phone', 'company', 'notes', 'tags'];
  } else {
    // Parse CSV file
    const rows = parseCSV(content);

    if (rows.length < 2) {
      return createErrorResponse(
        new BizError({ code: 'INVALID_CSV', message: 'CSV must have header row and at least one data row' }),
        context.requestId
      );
    }

    // Extract header row and column mapping
    headers = rows[0]?.map(h => h.toLowerCase().trim()) || [];

    if (columnMapping) {
      mapping = JSON.parse(columnMapping as string);
    } else {
      // Auto-detect columns
      mapping = {
        name: headers.findIndex(h => ['name', 'full name', 'fullname', 'contact name'].includes(h)),
        email: headers.findIndex(h => ['email', 'e-mail', 'email address'].includes(h)),
        phone: headers.findIndex(h => ['phone', 'telephone', 'mobile', 'phone number'].includes(h)),
        company: headers.findIndex(h => ['company', 'organization', 'org', 'employer'].includes(h)),
        notes: headers.findIndex(h => ['notes', 'note', 'comments'].includes(h)),
        tags: headers.findIndex(h => ['tags', 'labels', 'keywords'].includes(h)),
        category: headers.findIndex(h => ['category', 'type', 'group'].includes(h))
      };

      // Convert -1 to null
      Object.keys(mapping).forEach(key => {
        if (mapping[key] === -1) mapping[key] = null;
      });
    }

    // Parse data rows with mapping
    const dataRows = rows.slice(1);
    parsedRows = dataRows.map(row => ({
      name: mapping.name !== null && mapping.name !== undefined ? row[mapping.name] || '' : '',
      email: mapping.email !== null && mapping.email !== undefined ? row[mapping.email] : undefined,
      phone: mapping.phone !== null && mapping.phone !== undefined ? row[mapping.phone] : undefined,
      company: mapping.company !== null && mapping.company !== undefined ? row[mapping.company] : undefined,
      notes: mapping.notes !== null && mapping.notes !== undefined ? row[mapping.notes] : undefined,
      tags: mapping.tags !== null && mapping.tags !== undefined ? row[mapping.tags] : undefined,
      category: mapping.category !== null && mapping.category !== undefined ? row[mapping.category] : undefined
    })).filter(row => row.name.trim()); // Filter out empty rows
  }

  // Limit to 500 contacts
  if (parsedRows.length > 500) {
    return createErrorResponse(
      new BizError({ code: 'TOO_MANY_ROWS', message: 'Maximum 500 contacts per import' }),
      context.requestId
    );
  }

  // Generate preview
  const preview = await service.previewImport(userId, parsedRows);

  return createSuccessResponse({
    preview,
    headers,
    detectedMapping: mapping,
    fileType // Include file type so frontend knows whether to show column mapping
  }, context.requestId);
}, {
  requireAuth: true
});
