/**
 * Listing Import Execution API Endpoint
 *
 * POST /api/admin/listings/import
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 * - conflictResolution: 'skip' | 'overwrite' | 'rename' | 'update_existing'
 *
 * IMPORT DEFAULT VALUES (per ImportExportModal.md):
 * - claimed: false (unclaimed) - UNLESS updating existing claimed record
 * - approved: 'pending' - UNLESS updating existing approved listing
 * - mock: false (live data)
 * - status: 'active' - unless specified in import
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Admin-only access
 * - Activity logging for imports
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 * @updated 2026-02-01 - Added correct import defaults per ImportExportModal.md
 * @see docs/components/admin/categories/ImportExportModal.md - Listings Import Default Values
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getActivityLoggingService } from '@core/services/ActivityLoggingService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import {
  parseListingJSONImport,
  parseListingCSVImport,
  parseListingSQLImport
} from '@core/utils/import/listingImport';
import type { ImportListingInput, ImportResult, ConflictResolution, SkippedRecord } from '@core/types/import-export';
import { NextRequest } from 'next/server';

interface ImportExecuteRequest {
  format: 'json' | 'csv' | 'sql';
  content: string;
  conflictResolution: ConflictResolution;
}

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string, suffix?: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Normalize location for address comparison
 * Combines address + city for matching
 */
function normalizeLocation(address: string | null | undefined, city: string | null | undefined): string {
  const addr = (address || '').toLowerCase().trim();
  const c = (city || '').toLowerCase().trim();
  return addr ? `${addr}|${c}` : c;
}

export const POST = apiHandler(async (context: ApiContext) => {
  const { request, logger } = context;

  // Get current admin user
  const currentUser = await getUserFromRequest(request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const body = await request.json() as ImportExecuteRequest;

  // Validate request
  if (!body.format || !['json', 'csv', 'sql'].includes(body.format)) {
    throw BizError.badRequest('Invalid format. Must be json, csv, or sql');
  }

  if (!body.content || typeof body.content !== 'string') {
    throw BizError.badRequest('Content is required');
  }

  if (!body.conflictResolution || !['skip', 'overwrite', 'rename', 'update_existing'].includes(body.conflictResolution)) {
    throw BizError.badRequest('Invalid conflict resolution. Must be skip, overwrite, rename, or update_existing');
  }

  // Parse content
  let listings: ImportListingInput[];

  try {
    switch (body.format) {
      case 'json':
        listings = parseListingJSONImport(body.content);
        break;

      case 'csv':
        listings = parseListingCSVImport(body.content);
        break;

      case 'sql':
        listings = parseListingSQLImport(body.content);
        break;

      default:
        throw BizError.badRequest('Unsupported format');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    throw BizError.badRequest(`Failed to parse ${body.format.toUpperCase()}: ${errorMessage}`);
  }

  const db = getDatabaseService();
  const activityService = getActivityLoggingService();

  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    renamed: 0,
    errors: [],
    skippedRecords: []
  };

  // Helper to track skipped records
  const trackSkipped = (row: number, name: string, reason: string) => {
    result.skipped++;
    result.skippedRecords!.push({ row, name, reason });
  };

  // Process each listing
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const row = i + 1;

    // Skip records without valid names
    if (!listing || !listing.name?.trim()) {
      trackSkipped(row, listing?.name || '(empty)', 'Missing or empty name field');
      continue;
    }

    try {
      // ADDRESS-AWARE DUPLICATE DETECTION
      // Logic:
      // - Same name + same address = TRUE duplicate (apply conflict resolution)
      // - Same name + different address = FRANCHISE location (allow as new)
      // - Same slug + any address = Slug collision (handle per resolution)
      const slug = listing.slug || generateSlug(listing.name);
      const importLocation = normalizeLocation(listing.address, listing.city);

      // Query for potential matches by name OR slug, including address info
      const existing = await db.query<{
        id: number;
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        claimed: number;
        approved: string
      }>(
        'SELECT id, name, slug, address, city, claimed, approved FROM listings WHERE LOWER(name) = ? OR LOWER(slug) = ?',
        [listing.name.toLowerCase(), slug.toLowerCase()]
      );

      // Analyze matches with address awareness
      let trueDuplicate: typeof existing.rows[0] | null = null;
      let slugOnlyCollision: typeof existing.rows[0] | null = null;

      for (const existingListing of existing.rows) {
        if (!existingListing) continue;

        const existingLocation = normalizeLocation(existingListing.address, existingListing.city);
        const isSameLocation = importLocation === existingLocation || (!importLocation && !existingLocation);
        const isNameMatch = existingListing.name.toLowerCase() === listing.name.toLowerCase();
        const isSlugMatch = existingListing.slug.toLowerCase() === slug.toLowerCase();

        // TRUE DUPLICATE: Same name AND same location
        if (isNameMatch && isSameLocation) {
          trueDuplicate = existingListing;
          break; // Found definitive duplicate
        }

        // TRUE DUPLICATE: Same slug AND same location (different name but same place)
        if (isSlugMatch && isSameLocation) {
          trueDuplicate = existingListing;
          break;
        }

        // SLUG COLLISION: Same slug but different location (needs rename, not skip)
        if (isSlugMatch && !isSameLocation && !slugOnlyCollision) {
          slugOnlyCollision = existingListing;
          // Don't break - keep looking for true duplicate
        }

        // FRANCHISE CASE: Same name but different location
        // This is NOT a duplicate - do nothing, allow import as new
      }

      if (trueDuplicate) {
        // TRUE DUPLICATE FOUND - apply conflict resolution
        switch (body.conflictResolution) {
          case 'skip':
            const matchedBy = trueDuplicate.name.toLowerCase() === listing.name.toLowerCase()
              ? 'name'
              : 'slug';
            const locationInfo = trueDuplicate.address || trueDuplicate.city || 'same location';
            trackSkipped(
              row,
              listing.name,
              `Duplicate ${matchedBy} at ${locationInfo} - matches existing listing "${trueDuplicate.name}" (ID: ${trueDuplicate.id})`
            );
            continue;

          case 'overwrite':
            // Update existing listing with ALL fields
            // IMPORT DEFAULTS: Preserve claimed/approved status per ImportExportModal.md
            const preserveClaimed = trueDuplicate.claimed === 1 ? 1 : (listing.claimed ? 1 : 0);
            const preserveApproved = trueDuplicate.approved === 'approved'
              ? 'approved'
              : (listing.approved || 'pending');

            await db.query(
              `UPDATE listings SET
                type = ?,
                tier = ?,
                status = ?,
                approved = ?,
                description = ?,
                address = ?,
                city = ?,
                state = ?,
                zip_code = ?,
                country = ?,
                latitude = ?,
                longitude = ?,
                email = ?,
                phone = ?,
                website = ?,
                year_established = ?,
                employee_count = ?,
                logo_url = ?,
                cover_image_url = ?,
                gallery_images = ?,
                video_url = ?,
                audio_url = ?,
                business_hours = ?,
                social_media = ?,
                features = ?,
                amenities = ?,
                add_ons = ?,
                meta_title = ?,
                meta_description = ?,
                meta_keywords = ?,
                custom_fields = ?,
                metadata = ?,
                contact_name = ?,
                contact_email = ?,
                contact_phone = ?,
                annual_revenue = ?,
                certifications = ?,
                languages_spoken = ?,
                payment_methods = ?,
                keywords = ?,
                slogan = ?,
                claimed = ?,
                mock = ?,
                last_update = NOW()
              WHERE id = ?`,
              [
                listing.type || 'Standard',
                listing.tier || 'essentials',
                listing.status || 'active',
                preserveApproved,
                listing.description || null,
                listing.address || null,
                listing.city || null,
                listing.state || null,
                listing.zip_code || null,
                listing.country || null,
                listing.latitude || null,
                listing.longitude || null,
                listing.email || null,
                listing.phone || null,
                listing.website || null,
                listing.year_established || null,
                listing.employee_count || null,
                listing.logo_url || null,
                listing.cover_image_url || null,
                listing.gallery_images ? JSON.stringify(listing.gallery_images) : null,
                listing.video_url || null,
                listing.audio_url || null,
                listing.business_hours ? JSON.stringify(listing.business_hours) : null,
                listing.social_media ? JSON.stringify(listing.social_media) : null,
                listing.features ? JSON.stringify(listing.features) : null,
                listing.amenities ? JSON.stringify(listing.amenities) : null,
                listing.add_ons ? JSON.stringify(listing.add_ons) : null,
                listing.meta_title || null,
                listing.meta_description || null,
                listing.meta_keywords || null,
                listing.custom_fields ? JSON.stringify(listing.custom_fields) : null,
                listing.metadata ? JSON.stringify(listing.metadata) : null,
                listing.contact_name || null,
                listing.contact_email || null,
                listing.contact_phone || null,
                listing.annual_revenue || null,
                listing.certifications ? JSON.stringify(listing.certifications) : null,
                listing.languages_spoken ? JSON.stringify(listing.languages_spoken) : null,
                listing.payment_methods ? JSON.stringify(listing.payment_methods) : null,
                listing.keywords ? JSON.stringify(listing.keywords) : null, // DB has json_valid() constraint
                listing.slogan || null,
                preserveClaimed,
                0, // mock = false (live data) per ImportExportModal.md
                trueDuplicate.id
              ]
            );
            result.updated++;
            continue;

          case 'update_existing':
            // MERGE: Update only non-empty fields from import, preserve existing values for empty fields
            // This fills in empty DB fields with import data without wiping existing data

            // Query the FULL existing record to merge with
            const existingFull = await db.query<{
              id: number;
              type: string | null;
              tier: string | null;
              status: string | null;
              approved: string | null;
              description: string | null;
              address: string | null;
              city: string | null;
              state: string | null;
              zip_code: string | null;
              country: string | null;
              latitude: number | null;
              longitude: number | null;
              email: string | null;
              phone: string | null;
              website: string | null;
              year_established: number | null;
              employee_count: number | null;
              logo_url: string | null;
              cover_image_url: string | null;
              gallery_images: string | null;
              video_url: string | null;
              audio_url: string | null;
              business_hours: string | null;
              social_media: string | null;
              features: string | null;
              amenities: string | null;
              add_ons: string | null;
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
              keywords: string | null;
              slogan: string | null;
              claimed: number;
              mock: number;
            }>(
              `SELECT id, type, tier, status, approved, description, address, city, state, zip_code, country,
                latitude, longitude, email, phone, website, year_established, employee_count,
                logo_url, cover_image_url, gallery_images, video_url, audio_url,
                business_hours, social_media, features, amenities, add_ons,
                meta_title, meta_description, meta_keywords, custom_fields, metadata,
                contact_name, contact_email, contact_phone, annual_revenue,
                certifications, languages_spoken, payment_methods, keywords, slogan, claimed, mock
              FROM listings WHERE id = ?`,
              [trueDuplicate.id]
            );

            if (!existingFull.rows[0]) {
              // Shouldn't happen, but fallback to skip
              trackSkipped(row, listing.name, 'Could not fetch existing record for merge');
              continue;
            }

            const existing = existingFull.rows[0];

            // Helper to merge: use import value if non-empty, otherwise keep existing
            const mergeValue = <T>(importVal: T | null | undefined, existingVal: T | null): T | null => {
              // Check if import value is "meaningful" (not null, not undefined, not empty string)
              if (importVal !== null && importVal !== undefined && importVal !== '') {
                return importVal as T;
              }
              return existingVal;
            };

            // Helper for JSON fields - need to handle already-parsed objects
            // NOTE: mariadb auto-parses JSON columns into JS arrays/objects, so both
            // importVal and existingVal may be arrays/objects that need stringifying
            const mergeJsonValue = (importVal: unknown, existingVal: unknown): string | null => {
              // Helper to stringify if needed
              const stringify = (val: unknown): string | null => {
                if (val === null || val === undefined) return null;
                if (Array.isArray(val) && val.length > 0) return JSON.stringify(val);
                if (typeof val === 'object' && Object.keys(val as object).length > 0) return JSON.stringify(val);
                if (typeof val === 'string' && val.trim()) return val;
                return null;
              };

              // Check import value first (takes precedence if non-empty)
              const importStr = stringify(importVal);
              if (importStr) return importStr;

              // Fall back to existing value (also needs stringify since mariadb auto-parses JSON)
              return stringify(existingVal);
            };

            // Special handler for state field - JBusiness exported numeric publication status
            // (0/1) instead of actual state names. Single-digit values are INVALID and must
            // be overwritten with import value or set to null.
            const mergeStateValue = (importState: string | null | undefined, existingState: string | null): string | null => {
              // Check if existing state is invalid (single digit = JBusiness publication status)
              const isExistingInvalid = existingState !== null &&
                /^\d{1,2}$/.test(existingState.trim());

              // If existing is invalid, prefer import value (even if empty - better null than "1")
              if (isExistingInvalid) {
                // Use import state if available, otherwise null (clear the bad data)
                return (importState && importState.trim()) ? importState : null;
              }

              // Normal merge: import takes precedence if non-empty
              if (importState !== null && importState !== undefined && importState !== '') {
                return importState;
              }
              return existingState;
            };

            // Preserve claimed/approved status per ImportExportModal.md
            const mergedClaimed = existing.claimed === 1 ? 1 : (listing.claimed ? 1 : 0);
            const mergedApproved = existing.approved === 'approved'
              ? 'approved'
              : mergeValue(listing.approved, existing.approved) || 'pending';

            // Build merged values - import non-empty values fill in, existing values preserved
            await db.query(
              `UPDATE listings SET
                type = ?,
                tier = ?,
                status = ?,
                approved = ?,
                description = ?,
                address = ?,
                city = ?,
                state = ?,
                zip_code = ?,
                country = ?,
                latitude = ?,
                longitude = ?,
                email = ?,
                phone = ?,
                website = ?,
                year_established = ?,
                employee_count = ?,
                logo_url = ?,
                cover_image_url = ?,
                gallery_images = ?,
                video_url = ?,
                audio_url = ?,
                business_hours = ?,
                social_media = ?,
                features = ?,
                amenities = ?,
                add_ons = ?,
                meta_title = ?,
                meta_description = ?,
                meta_keywords = ?,
                custom_fields = ?,
                metadata = ?,
                contact_name = ?,
                contact_email = ?,
                contact_phone = ?,
                annual_revenue = ?,
                certifications = ?,
                languages_spoken = ?,
                payment_methods = ?,
                keywords = ?,
                slogan = ?,
                claimed = ?,
                mock = ?,
                last_update = NOW()
              WHERE id = ?`,
              [
                mergeValue(listing.type, existing.type) || 'Standard',
                mergeValue(listing.tier, existing.tier) || 'essentials',
                mergeValue(listing.status, existing.status) || 'active',
                mergedApproved,
                mergeValue(listing.description, existing.description),
                mergeValue(listing.address, existing.address),
                mergeValue(listing.city, existing.city),
                mergeStateValue(listing.state, existing.state), // Special handler for invalid numeric state values
                mergeValue(listing.zip_code, existing.zip_code),
                mergeValue(listing.country, existing.country),
                mergeValue(listing.latitude, existing.latitude),
                mergeValue(listing.longitude, existing.longitude),
                mergeValue(listing.email, existing.email),
                mergeValue(listing.phone, existing.phone),
                mergeValue(listing.website, existing.website),
                mergeValue(listing.year_established, existing.year_established),
                mergeValue(listing.employee_count, existing.employee_count),
                mergeValue(listing.logo_url, existing.logo_url),
                mergeValue(listing.cover_image_url, existing.cover_image_url),
                mergeJsonValue(listing.gallery_images, existing.gallery_images),
                mergeValue(listing.video_url, existing.video_url),
                mergeValue(listing.audio_url, existing.audio_url),
                mergeJsonValue(listing.business_hours, existing.business_hours),
                mergeJsonValue(listing.social_media, existing.social_media),
                mergeJsonValue(listing.features, existing.features),
                mergeJsonValue(listing.amenities, existing.amenities),
                mergeJsonValue(listing.add_ons, existing.add_ons),
                mergeValue(listing.meta_title, existing.meta_title),
                mergeValue(listing.meta_description, existing.meta_description),
                mergeValue(listing.meta_keywords, existing.meta_keywords),
                mergeJsonValue(listing.custom_fields, existing.custom_fields),
                mergeJsonValue(listing.metadata, existing.metadata),
                mergeValue(listing.contact_name, existing.contact_name),
                mergeValue(listing.contact_email, existing.contact_email),
                mergeValue(listing.contact_phone, existing.contact_phone),
                mergeValue(listing.annual_revenue, existing.annual_revenue),
                mergeJsonValue(listing.certifications, existing.certifications),
                mergeJsonValue(listing.languages_spoken, existing.languages_spoken),
                mergeJsonValue(listing.payment_methods, existing.payment_methods),
                mergeJsonValue(listing.keywords, existing.keywords), // DB has json_valid() constraint
                mergeValue(listing.slogan, existing.slogan),
                mergedClaimed,
                existing.mock, // Preserve mock status for update_existing
                trueDuplicate.id
              ]
            );
            result.updated++;
            continue;

          case 'rename':
            // Create with modified slug (fall through to create)
            listing.slug = generateSlug(listing.name, Date.now().toString());
            result.renamed++;
            break;
        }
      } else if (slugOnlyCollision) {
        // SLUG COLLISION (different location) - auto-rename slug regardless of resolution
        // This allows franchise locations with same-sounding names
        listing.slug = generateSlug(listing.name, Date.now().toString());
        result.renamed++;
        // Fall through to create as new
      }

      // Look up owner by email if provided
      let userId: number | null = null;
      if (listing.owner_email) {
        const owner = await db.query<{ id: number }>(
          'SELECT id FROM users WHERE LOWER(email) = ?',
          [listing.owner_email.toLowerCase()]
        );
        if (owner.rows.length > 0 && owner.rows[0]) {
          userId = owner.rows[0].id;
        }
      }

      // Use category_id directly without validation
      // NOTE: JBusiness uses different category IDs (15000-22000 range) than Bizconekt (1-2328)
      // No FK constraint exists, so we store the JBusiness ID for later mapping/migration
      const categoryId = listing.category_id || null;

      // Generate unique slug
      let finalSlug = listing.slug || generateSlug(listing.name);
      const slugExists = await db.query<{ id: number }>(
        'SELECT id FROM listings WHERE LOWER(slug) = ?',
        [finalSlug.toLowerCase()]
      );
      if (slugExists.rows.length > 0) {
        finalSlug = generateSlug(listing.name, Date.now().toString());
      }

      // Create new listing with ALL fields
      // IMPORT DEFAULTS (per ImportExportModal.md):
      // - claimed: false (0) - All new imports are UNCLAIMED
      // - approved: 'pending' - All new imports are PENDING approval
      // - mock: false (0) - All imports are LIVE data (not mock)
      // - status: 'active' - Default to active unless specified

      await db.query(
        `INSERT INTO listings (
          name, slug, type, tier, status, approved,
          user_id, category_id, description,
          address, city, state, zip_code, country,
          latitude, longitude,
          email, phone, website,
          year_established, employee_count,
          logo_url, cover_image_url, gallery_images,
          video_url, audio_url,
          business_hours, social_media, features, amenities,
          add_ons,
          meta_title, meta_description, meta_keywords,
          custom_fields, metadata,
          contact_name, contact_email, contact_phone,
          annual_revenue, certifications, languages_spoken, payment_methods,
          keywords, slogan,
          claimed, mock,
          import_source, import_date,
          created_at, last_update
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [
          listing.name.trim(),
          finalSlug,
          listing.type || 'Standard',
          listing.tier || 'essentials',  // DB enum: essentials, plus, preferred, premium
          listing.status || 'active',    // Default to active per ImportExportModal.md
          'pending',                     // ALWAYS pending for new imports per ImportExportModal.md
          userId,
          categoryId,
          listing.description || null,
          listing.address || null,
          listing.city || null,
          listing.state || null,
          listing.zip_code || null,
          listing.country || null,
          listing.latitude || null,
          listing.longitude || null,
          listing.email || null,
          listing.phone || null,
          listing.website || null,
          listing.year_established || null,
          listing.employee_count || null,
          listing.logo_url || null,
          listing.cover_image_url || null,
          listing.gallery_images ? JSON.stringify(listing.gallery_images) : null,
          listing.video_url || null,
          listing.audio_url || null,
          listing.business_hours ? JSON.stringify(listing.business_hours) : null,
          listing.social_media ? JSON.stringify(listing.social_media) : null,
          listing.features ? JSON.stringify(listing.features) : null,
          listing.amenities ? JSON.stringify(listing.amenities) : null,
          listing.add_ons ? JSON.stringify(listing.add_ons) : null,
          listing.meta_title || null,
          listing.meta_description || null,
          listing.meta_keywords || null,
          listing.custom_fields ? JSON.stringify(listing.custom_fields) : null,
          listing.metadata ? JSON.stringify(listing.metadata) : null,
          listing.contact_name || null,
          listing.contact_email || null,
          listing.contact_phone || null,
          listing.annual_revenue || null,
          listing.certifications ? JSON.stringify(listing.certifications) : null,
          listing.languages_spoken ? JSON.stringify(listing.languages_spoken) : null,
          listing.payment_methods ? JSON.stringify(listing.payment_methods) : null,
          listing.keywords ? JSON.stringify(listing.keywords) : null, // DB has json_valid() constraint
          listing.slogan || null,
          0,                             // claimed = false (unclaimed) per ImportExportModal.md
          0,                             // mock = false (live) per ImportExportModal.md
          `admin_import_${body.format}`, // Track import source
        ]
      );

      result.imported++;
    } catch (error) {
      // Extract more detailed error info for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const sqlError = (error as { code?: string; sqlMessage?: string })?.sqlMessage ||
                       (error as { code?: string; sqlMessage?: string })?.code || '';
      result.errors.push({
        row,
        field: 'general',
        message: `${listing.name}: ${errorMessage}${sqlError ? ` (${sqlError})` : ''}`
      });
    }
  }

  // Log activity
  await activityService.logActivity({
    userId: currentUser.id,
    action: 'listings_imported',
    actionType: 'account',
    description: `Imported listings: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped, ${result.renamed} renamed, ${result.errors.length} errors`,
    entityType: 'listing',
    success: true,
    metadata: {
      format: body.format,
      conflictResolution: body.conflictResolution,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      renamed: result.renamed,
      errorCount: result.errors.length
    }
  });

  // Log to AdminActivityService for admin audit trail
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: currentUser.id,
    targetEntityType: 'listing',
    targetEntityId: 0,
    actionType: 'listings_imported',
    actionCategory: 'import',
    actionDescription: `Imported listings: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped`,
    afterData: { imported: result.imported, updated: result.updated, skipped: result.skipped, format: body.format },
    severity: result.errors.length > 0 ? 'high' : 'normal'
  });

  logger.info('Listing import completed', {
    operation: 'import-listings',
    metadata: {
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      renamed: result.renamed,
      errorCount: result.errors.length
    }
  });

  return createSuccessResponse(result);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
  timeout: 300000 // 5 minutes for large imports
});
