/**
 * Listing Export Utilities
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - PII awareness: Contains owner emails
 * - TypeScript strict mode
 * - Export includes ALL database table fields (58 columns)
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 * @updated 2026-02-01 - Expanded to include ALL DB fields per ImportExportModal.md requirements
 * @see docs/components/admin/categories/ImportExportModal.md - Entity-Specific Import/Export Rules
 */

import type { ListingExportData } from '@core/types/import-export';

/**
 * ALL listing fields for export - MUST match database schema exactly
 *
 * REQUIREMENT: Export must include ALL fields from the listings database table,
 * not just the columns displayed in the admin table view.
 *
 * @see docs/components/admin/categories/ImportExportModal.md - CRITICAL REQUIREMENTS
 */
const LISTING_EXPORT_FIELDS: (keyof ListingExportData)[] = [
  // Primary identifiers
  'id',
  'user_id',
  'name',
  'slug',

  // Basic information
  'description',
  'type',
  'year_established',
  'employee_count',

  // Contact information
  'email',
  'phone',
  'website',

  // Location
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'latitude',
  'longitude',

  // Category
  'category_id',
  'category_name',
  'owner_email',

  // Media
  'logo_url',
  'cover_image_url',
  'gallery_images',
  'video_url',
  'audio_url',

  // Business details
  'business_hours',
  'social_media',
  'features',
  'amenities',

  // Subscription
  'tier',
  'add_ons',

  // Status flags
  'claimed',
  'status',
  'approved',
  'mock',

  // SEO
  'meta_title',
  'meta_description',
  'meta_keywords',

  // Custom data
  'custom_fields',
  'metadata',

  // Contact person
  'contact_name',
  'contact_email',
  'contact_phone',

  // Business metrics
  'annual_revenue',
  'certifications',
  'languages_spoken',
  'payment_methods',

  // Analytics
  'view_count',
  'click_count',
  'favorite_count',

  // Import tracking
  'import_source',
  'import_date',
  'import_batch_id',

  // Additional fields
  'keywords',
  'slogan',

  // Timestamps
  'date_created',
  'last_update',
  'created_at',
  'updated_at'
];

/**
 * Sanitize listing object for export
 */
function sanitizeListingForExport(
  listing: Partial<ListingExportData> & { [key: string]: unknown }
): ListingExportData {
  const sanitized: Partial<ListingExportData> = {};

  for (const field of LISTING_EXPORT_FIELDS) {
    if (field in listing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sanitized as any)[field] = (listing as any)[field];
    }
  }

  return sanitized as ListingExportData;
}

/**
 * Generate JSON export for listings
 */
export function generateListingJSONExport(
  listings: Array<Partial<ListingExportData> & { [key: string]: unknown }>
): string {
  const sanitized = listings.map(sanitizeListingForExport);
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Generate CSV export for listings
 */
export function generateListingCSVExport(
  listings: Array<Partial<ListingExportData> & { [key: string]: unknown }>
): string {
  const sanitized = listings.map(sanitizeListingForExport);

  if (sanitized.length === 0) {
    return '';
  }

  const headers = LISTING_EXPORT_FIELDS.join(',');
  const rows = sanitized.map(listing => {
    return LISTING_EXPORT_FIELDS.map(field => {
      const value = listing[field];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) {
        // Handle add_ons array
        const joined = value.join(';');
        return `"${joined.replace(/"/g, '""')}"`;
      }
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '""');
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${escaped}"`
          : escaped;
      }
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Generate SQL export for listings
 */
export function generateListingSQLExport(
  listings: Array<Partial<ListingExportData> & { [key: string]: unknown }>
): string {
  const sanitized = listings.map(sanitizeListingForExport);

  if (sanitized.length === 0) {
    return '-- No listings to export';
  }

  const lines = [
    '-- Listing Export',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total: ${sanitized.length} listings`,
    '',
    '-- NOTE: Owner associations may need manual adjustment.',
    '-- Import will attempt to match owner_email to existing users.',
    ''
  ];

  // Fields for SQL insert (excluding id, created_at, last_update)
  const sqlFields = LISTING_EXPORT_FIELDS.filter(
    f => f !== 'id' && f !== 'created_at' && f !== 'last_update' && f !== 'owner_email' && f !== 'category_name'
  );

  sanitized.forEach(listing => {
    const values = sqlFields.map(field => {
      const value = listing[field];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (Array.isArray(value)) {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      }
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      return String(value);
    });

    lines.push(
      `INSERT INTO listings (${sqlFields.join(', ')}) VALUES (${values.join(', ')});`
    );
  });

  return lines.join('\n');
}
