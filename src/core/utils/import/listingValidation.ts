/**
 * Listing Import Validation Utilities
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - TypeScript strict mode
 *
 * @tier ADVANCED
 * @phase Phase 7 - Listing Import/Export
 */

import type { ImportListingInput, ImportError } from '@core/types/import-export';

/**
 * Valid tier values
 * Database enum: essentials, plus, preferred, premium
 */
const VALID_TIERS = ['essentials', 'plus', 'preferred', 'premium'];

/**
 * Valid status values
 */
const VALID_STATUSES = ['active', 'inactive', 'pending', 'suspended'];

/**
 * Valid approval values
 */
const VALID_APPROVALS = ['pending', 'approved', 'rejected'];

/**
 * Validate listing import data
 * @param listings Parsed listing data from file
 * @returns Array of validation errors
 */
export function validateListingImport(listings: ImportListingInput[]): ImportError[] {
  const errors: ImportError[] = [];
  // Use composite key: name + address (or city if no address) for duplicate detection
  // This allows businesses with multiple locations (same name, different addresses)
  const seenListings = new Set<string>();
  const seenSlugs = new Set<string>();

  listings.forEach((listing, index) => {
    const row = index + 1; // 1-indexed for user display

    // Required field: name
    if (!listing.name || typeof listing.name !== 'string' || !listing.name.trim()) {
      errors.push({
        row,
        field: 'name',
        message: 'Listing name is required'
      });
    } else {
      // Name length validation
      if (listing.name.trim().length < 2) {
        errors.push({
          row,
          field: 'name',
          message: `Name too short: "${listing.name}". Minimum 2 characters.`
        });
      } else if (listing.name.trim().length > 255) {
        errors.push({
          row,
          field: 'name',
          message: `Name too long: "${listing.name.substring(0, 50)}...". Maximum 255 characters.`
        });
      }

      // Duplicate detection within file using composite key: name + location
      // This allows businesses with multiple locations (e.g., "ARCO" in different cities)
      const normalizedName = listing.name.trim().toLowerCase();
      const locationKey = listing.address
        ? listing.address.trim().toLowerCase()
        : (listing.city ? listing.city.trim().toLowerCase() : '');
      const compositeKey = `${normalizedName}|${locationKey}`;

      if (seenListings.has(compositeKey)) {
        // Only show error if we have location info, otherwise it's truly a duplicate
        const locationInfo = listing.address || listing.city;
        if (locationInfo) {
          errors.push({
            row,
            field: 'name',
            message: `Duplicate listing in file: "${listing.name}" at "${locationInfo}"`
          });
        } else {
          errors.push({
            row,
            field: 'name',
            message: `Duplicate name in file: "${listing.name}" (no address to distinguish)`
          });
        }
      }
      seenListings.add(compositeKey);
    }

    // Slug validation (if provided)
    if (listing.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(listing.slug)) {
        errors.push({
          row,
          field: 'slug',
          message: `Invalid slug format: "${listing.slug}". Only lowercase letters, numbers, and hyphens allowed.`
        });
      }

      // Duplicate slug detection within file
      const normalizedSlug = listing.slug.toLowerCase();
      if (seenSlugs.has(normalizedSlug)) {
        errors.push({
          row,
          field: 'slug',
          message: `Duplicate slug in file: "${listing.slug}"`
        });
      }
      seenSlugs.add(normalizedSlug);
    }

    // Tier validation
    if (listing.tier && !VALID_TIERS.includes(listing.tier)) {
      errors.push({
        row,
        field: 'tier',
        message: `Invalid tier: "${listing.tier}". Must be one of: ${VALID_TIERS.join(', ')}.`
      });
    }

    // Status validation
    if (listing.status && !VALID_STATUSES.includes(listing.status)) {
      errors.push({
        row,
        field: 'status',
        message: `Invalid status: "${listing.status}". Must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }

    // Approval validation
    if (listing.approved && !VALID_APPROVALS.includes(listing.approved)) {
      errors.push({
        row,
        field: 'approved',
        message: `Invalid approval status: "${listing.approved}". Must be one of: ${VALID_APPROVALS.join(', ')}.`
      });
    }

    // Email validation (contact email)
    if (listing.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(listing.email)) {
        errors.push({
          row,
          field: 'email',
          message: `Invalid email format: "${listing.email}"`
        });
      }
    }

    // Owner email validation
    if (listing.owner_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(listing.owner_email)) {
        errors.push({
          row,
          field: 'owner_email',
          message: `Invalid owner email format: "${listing.owner_email}"`
        });
      }
    }

    // Website validation
    if (listing.website) {
      try {
        new URL(listing.website.startsWith('http') ? listing.website : `https://${listing.website}`);
      } catch {
        errors.push({
          row,
          field: 'website',
          message: `Invalid website URL: "${listing.website}"`
        });
      }
    }

    // ZIP code validation (basic)
    if (listing.zip_code) {
      const zipRegex = /^[A-Za-z0-9\s-]{3,10}$/;
      if (!zipRegex.test(listing.zip_code)) {
        errors.push({
          row,
          field: 'zip_code',
          message: `Invalid ZIP code format: "${listing.zip_code}"`
        });
      }
    }
  });

  return errors;
}
