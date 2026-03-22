/**
 * Admin Listings Export API Route
 *
 * GET /api/admin/listings/export
 * - format: 'json' | 'csv' | 'sql'
 * - scope: 'all' | 'selected'
 * - ids: comma-separated IDs (when scope=selected)
 *
 * CRITICAL: Exports ALL 58 database fields per ImportExportModal.md requirements
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Admin-only access
 * - Full database field coverage
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 * @see docs/components/admin/categories/ImportExportModal.md - CRITICAL REQUIREMENTS
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { safeJsonParse } from '@core/utils/bigint';
import {
  generateListingJSONExport,
  generateListingCSVExport,
  generateListingSQLExport
} from '@core/utils/export/listingExport';
import type { ListingExportData, ExportFormat } from '@core/types/import-export';
import { NextRequest } from 'next/server';

/**
 * ALL 58 database columns for listings table
 * This MUST match the database schema exactly
 */
const ALL_LISTING_COLUMNS = `
  l.id,
  l.user_id,
  l.name,
  l.slug,
  l.description,
  l.type,
  l.year_established,
  l.employee_count,
  l.email,
  l.phone,
  l.website,
  l.address,
  l.city,
  l.state,
  l.zip_code,
  l.country,
  l.latitude,
  l.longitude,
  l.category_id,
  l.logo_url,
  l.cover_image_url,
  l.gallery_images,
  l.video_url,
  l.audio_url,
  l.business_hours,
  l.social_media,
  l.features,
  l.amenities,
  l.tier,
  l.add_ons,
  l.claimed,
  l.status,
  l.approved,
  l.mock,
  l.meta_title,
  l.meta_description,
  l.meta_keywords,
  l.custom_fields,
  l.metadata,
  l.contact_name,
  l.contact_email,
  l.contact_phone,
  l.annual_revenue,
  l.certifications,
  l.languages_spoken,
  l.payment_methods,
  l.view_count,
  l.click_count,
  l.favorite_count,
  l.import_source,
  l.import_date,
  l.import_batch_id,
  l.keywords,
  l.slogan,
  l.date_created,
  l.last_update,
  l.created_at,
  l.updated_at,
  c.name as category_name,
  u.email as owner_email
`;

interface ListingRow {
  id: number;
  user_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  year_established: number | null;
  employee_count: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  category_id: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_images: string | null;
  video_url: string | null;
  audio_url: string | null;
  business_hours: string | null;
  social_media: string | null;
  features: string | null;
  amenities: string | null;
  tier: string;
  add_ons: string | null;
  claimed: number;
  status: string;
  approved: string;
  mock: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  custom_fields: string | null;
  metadata: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  annual_revenue: number | null;
  certifications: string | null;
  languages_spoken: string | null;
  payment_methods: string | null;
  view_count: number;
  click_count: number;
  favorite_count: number;
  import_source: string | null;
  import_date: string | null;
  import_batch_id: string | null;
  keywords: string | null;
  slogan: string | null;
  date_created: string | null;
  last_update: string | null;
  created_at: string | null;
  updated_at: string | null;
  category_name: string | null;
  owner_email: string | null;
}

/**
 * GET /api/admin/listings/export
 * Export listings data in JSON, CSV, or SQL format
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Admin authentication
  const user = await getUserFromRequest(request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'json') as ExportFormat;
  const scope = url.searchParams.get('scope') || 'all';
  const idsParam = url.searchParams.get('ids');

  // Validate format
  if (!['json', 'csv', 'sql'].includes(format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  const db = getDatabaseService();

  // Build query
  let query = `
    SELECT ${ALL_LISTING_COLUMNS}
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN users u ON l.user_id = u.id
  `;

  const params: unknown[] = [];

  if (scope === 'selected' && idsParam) {
    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) {
      throw BizError.badRequest('No valid IDs provided');
    }
    query += ` WHERE l.id IN (${ids.map(() => '?').join(',')})`;
    params.push(...ids);
  }

  query += ' ORDER BY l.id ASC';

  const result = await db.query<ListingRow>(query, params);

  // Transform to export format
  const listings: ListingExportData[] = result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    type: row.type,
    year_established: row.year_established,
    employee_count: row.employee_count,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    category_id: row.category_id,
    category_name: row.category_name,
    owner_email: row.owner_email,
    logo_url: row.logo_url,
    cover_image_url: row.cover_image_url,
    gallery_images: safeJsonParse(row.gallery_images, null),
    video_url: row.video_url,
    audio_url: row.audio_url,
    business_hours: safeJsonParse(row.business_hours, null),
    social_media: safeJsonParse(row.social_media, null),
    features: safeJsonParse(row.features, null),
    amenities: safeJsonParse(row.amenities, null),
    tier: row.tier as ListingExportData['tier'],
    add_ons: safeJsonParse(row.add_ons, null),
    claimed: Boolean(row.claimed),
    status: row.status as ListingExportData['status'],
    approved: row.approved as ListingExportData['approved'],
    mock: Boolean(row.mock),
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    meta_keywords: row.meta_keywords,
    custom_fields: safeJsonParse(row.custom_fields, null),
    metadata: safeJsonParse(row.metadata, null),
    contact_name: row.contact_name,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    annual_revenue: row.annual_revenue,
    certifications: safeJsonParse(row.certifications, null),
    languages_spoken: safeJsonParse(row.languages_spoken, null),
    payment_methods: safeJsonParse(row.payment_methods, null),
    view_count: row.view_count || 0,
    click_count: row.click_count || 0,
    favorite_count: row.favorite_count || 0,
    import_source: row.import_source,
    import_date: row.import_date,
    import_batch_id: row.import_batch_id,
    keywords: row.keywords,
    slogan: row.slogan,
    date_created: row.date_created,
    last_update: row.last_update,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));

  // Generate export content using backend utilities
  let content: string;
  let contentType: string;
  let filename: string;

  // Cast to expected type for export utilities
  const exportListings = listings as Array<Partial<ListingExportData> & { [key: string]: unknown }>;

  switch (format) {
    case 'json':
      content = generateListingJSONExport(exportListings);
      contentType = 'application/json';
      filename = `listings-export-${new Date().toISOString().slice(0, 10)}.json`;
      break;

    case 'csv':
      content = generateListingCSVExport(exportListings);
      contentType = 'text/csv';
      filename = `listings-export-${new Date().toISOString().slice(0, 10)}.csv`;
      break;

    case 'sql':
      content = generateListingSQLExport(exportListings);
      contentType = 'text/plain';
      filename = `listings-export-${new Date().toISOString().slice(0, 10)}.sql`;
      break;

    default:
      throw BizError.badRequest('Invalid format');
  }

  return createSuccessResponse({
    content,
    contentType,
    filename,
    count: listings.length
  });
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
