/**
 * Listing Import Preview API Endpoint
 *
 * POST /api/admin/listings/import/preview
 * - format: 'json' | 'csv' | 'sql'
 * - content: file content as string
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Admin-only access
 * - 10MB file size limit
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import {
  parseListingJSONImport,
  parseListingCSVImport,
  parseListingSQLImport
} from '@core/utils/import/listingImport';
import { validateListingImport } from '@core/utils/import/listingValidation';
import type {
  ImportListingInput,
  ListingImportPreviewResult,
  ListingImportConflict,
  ImportError
} from '@core/types/import-export';

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

  // Validate import data
  const validationErrors = validateListingImport(listings);

  // Detect name/slug conflicts with existing listings using ADDRESS-AWARE logic
  // IMPORTANT: Must match execution logic exactly - check EACH row individually
  //
  // ADDRESS-AWARE DUPLICATE DETECTION:
  // - Same name + same address = TRUE duplicate (skip/update)
  // - Same name + different address = FRANCHISE location (allow import)
  // - Same slug + same address = TRUE duplicate
  // - Same slug + different address = Needs rename (slug collision)
  const db = getDatabaseService();
  const conflicts: ListingImportConflict[] = [];
  const conflictedRows = new Set<number>();

  // Helper to generate slug (must match execution route's generateSlug)
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Helper to normalize address for comparison
  const normalizeLocation = (address: string | null | undefined, city: string | null | undefined): string => {
    const addr = (address || '').toLowerCase().trim();
    const c = (city || '').toLowerCase().trim();
    // Combine address + city for location matching
    return addr ? `${addr}|${c}` : c;
  };

  // Get unique names and slugs (including generated slugs) for batch query
  const uniqueNames = new Set<string>();
  const uniqueSlugs = new Set<string>();

  listings.forEach(l => {
    if (l.name) uniqueNames.add(l.name.toLowerCase());
    // Generate slug if not provided (matches execution behavior)
    const slug = l.slug || (l.name ? generateSlug(l.name) : '');
    if (slug) uniqueSlugs.add(slug.toLowerCase());
  });

  // Batch query for all potential conflicts - NOW INCLUDES ADDRESS AND CITY
  const nameArray = Array.from(uniqueNames);
  const slugArray = Array.from(uniqueSlugs);

  // Create lookup maps from DB with address information
  const existingByName = new Map<string, { id: number; name: string; slug: string; address: string | null; city: string | null }[]>();
  const existingBySlug = new Map<string, { id: number; name: string; slug: string; address: string | null; city: string | null }>();

  if (nameArray.length > 0) {
    const placeholders = nameArray.map(() => '?').join(',');
    const result = await db.query<{ id: number; name: string; slug: string; address: string | null; city: string | null }>(
      `SELECT id, name, slug, address, city FROM listings WHERE LOWER(name) IN (${placeholders})`,
      nameArray
    );
    // Group by name (multiple locations may exist for same business name - franchises)
    result.rows.forEach(row => {
      if (row) {
        const key = row.name.toLowerCase();
        if (!existingByName.has(key)) {
          existingByName.set(key, []);
        }
        existingByName.get(key)!.push(row);
      }
    });
  }

  if (slugArray.length > 0) {
    const placeholders = slugArray.map(() => '?').join(',');
    const result = await db.query<{ id: number; name: string; slug: string; address: string | null; city: string | null }>(
      `SELECT id, name, slug, address, city FROM listings WHERE LOWER(slug) IN (${placeholders})`,
      slugArray
    );
    result.rows.forEach(row => {
      if (row) existingBySlug.set(row.slug.toLowerCase(), row);
    });
  }

  // Check EACH import row with ADDRESS-AWARE logic
  listings.forEach((listing, index) => {
    if (!listing.name) return;

    const row = index + 1;
    const listingName = listing.name.toLowerCase();
    const listingSlug = (listing.slug || generateSlug(listing.name)).toLowerCase();
    const importLocation = normalizeLocation(listing.address, listing.city);

    // Check name matches with address comparison
    const nameMatches = existingByName.get(listingName);
    if (nameMatches && nameMatches.length > 0) {
      // Check if ANY existing listing with this name has the same address
      const sameAddressMatch = nameMatches.find(existing => {
        const existingLocation = normalizeLocation(existing.address, existing.city);
        // If both have empty locations, consider it a match (can't distinguish)
        if (!importLocation && !existingLocation) return true;
        // If locations match, it's a true duplicate
        return importLocation === existingLocation;
      });

      if (sameAddressMatch) {
        // TRUE DUPLICATE: Same name AND same address
        conflicts.push({
          identifier: sameAddressMatch.name,
          type: 'name_and_address',
          existingId: sameAddressMatch.id,
          existingName: sameAddressMatch.name,
          existingAddress: sameAddressMatch.address || sameAddressMatch.city,
          importName: listing.name,
          importAddress: listing.address || listing.city,
          importRow: row,
          isTrueDuplicate: true,
          reason: `Exact match: same name "${listing.name}" at same location`
        });
        conflictedRows.add(row);
        return; // Don't double-count
      }
      // FRANCHISE CASE: Same name but different address - NOT a duplicate, allow import
      // No conflict added - this is a valid new franchise location
    }

    // Check slug match (even if name didn't match or was franchise)
    const slugMatch = existingBySlug.get(listingSlug);
    if (slugMatch) {
      const existingLocation = normalizeLocation(slugMatch.address, slugMatch.city);
      const isSameLocation = importLocation === existingLocation || (!importLocation && !existingLocation);

      if (isSameLocation) {
        // TRUE DUPLICATE: Same slug AND same address
        conflicts.push({
          identifier: slugMatch.slug,
          type: 'slug',
          existingId: slugMatch.id,
          existingName: slugMatch.name,
          existingAddress: slugMatch.address || slugMatch.city,
          importName: listing.name,
          importAddress: listing.address || listing.city,
          importRow: row,
          isTrueDuplicate: true,
          reason: `Slug collision at same location - likely same business`
        });
        conflictedRows.add(row);
      } else {
        // SLUG COLLISION but different address - needs rename, not skip
        conflicts.push({
          identifier: slugMatch.slug,
          type: 'slug',
          existingId: slugMatch.id,
          existingName: slugMatch.name,
          existingAddress: slugMatch.address || slugMatch.city,
          importName: listing.name,
          importAddress: listing.address || listing.city,
          importRow: row,
          isTrueDuplicate: false,
          reason: `Slug "${listingSlug}" already used by different location - will auto-rename`
        });
        // Note: We still add to conflicts for visibility, but isTrueDuplicate=false
        // indicates this can be resolved by renaming the slug
        conflictedRows.add(row);
      }
    }
  });

  // Calculate valid count: rows that have neither errors nor conflicts
  // Use Set to avoid double-counting rows with both
  const errorRows = new Set(validationErrors.map(e => e.row));
  const problemRows = new Set([...errorRows, ...conflictedRows]);
  const validCount = listings.length - problemRows.size;

  // Build preview result
  const preview: ListingImportPreviewResult = {
    total: listings.length,
    valid: validCount,
    conflicts,
    errors: validationErrors,
    preview: listings.slice(0, 100) // First 100 rows
  };

  return createSuccessResponse(preview);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
});
