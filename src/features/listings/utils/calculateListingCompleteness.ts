/**
 * Listing Completeness Calculation Utility
 *
 * Calculates listing completion percentage based on required and optional fields.
 * Uses weighted scoring: 70% required fields, 30% optional fields.
 *
 * @authority docs/pages/layouts/listings/details/claim/phases/PHASE_6_BRAIN_PLAN.md
 * @tier UTILITY
 * @phase Phase 6 - Listing Completeness Indicator
 * @reference src/features/profile/utils/calculateProfileCompletion.ts
 */

import type { Listing } from '@core/services/ListingService';

// ============================================================================
// TYPES
// ============================================================================

export interface ListingCompletionResult {
  /** Overall completion percentage (0-100) */
  percentage: number;
  /** Missing required fields */
  missingRequired: ListingField[];
  /** Missing optional fields */
  missingOptional: ListingField[];
  /** Completed required fields count */
  completedRequired: number;
  /** Completed optional fields count */
  completedOptional: number;
  /** Total required fields */
  totalRequired: number;
  /** Total optional fields */
  totalOptional: number;
}

export interface ListingField {
  /** Field key */
  key: keyof Listing;
  /** Display label */
  label: string;
  /** Weight towards completion (0-1) */
  weight: number;
  /** Whether this is a required field */
  required: boolean;
  /** Minimum length/count for array/object fields */
  minLength?: number;
  /** Minimum character count for string fields */
  minChars?: number;
}

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

/**
 * Required fields (70% of total completion)
 */
const REQUIRED_FIELDS: ListingField[] = [
  { key: 'name', label: 'Business Name', weight: 0.10, required: true },
  { key: 'description', label: 'Description', weight: 0.15, required: true, minChars: 50 },
  { key: 'address', label: 'Address', weight: 0.10, required: true },
  { key: 'phone', label: 'Phone Number', weight: 0.10, required: true },
  { key: 'email', label: 'Email', weight: 0.05, required: true },
  { key: 'category_id', label: 'Category', weight: 0.10, required: true },
  { key: 'business_hours', label: 'Business Hours', weight: 0.10, required: true, minLength: 1 }
];

/**
 * Optional fields (30% of total completion)
 */
const OPTIONAL_FIELDS: ListingField[] = [
  { key: 'logo_url', label: 'Logo', weight: 0.08, required: false },
  { key: 'cover_image_url', label: 'Cover Image', weight: 0.05, required: false },
  { key: 'gallery_images', label: 'Gallery Images', weight: 0.05, required: false, minLength: 1 },
  { key: 'social_media', label: 'Social Media', weight: 0.04, required: false, minLength: 1 },
  { key: 'features', label: 'Features', weight: 0.03, required: false, minLength: 1 },
  { key: 'amenities', label: 'Amenities', weight: 0.03, required: false, minLength: 1 },
  { key: 'website', label: 'Website', weight: 0.02, required: false }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a listing field has a non-empty value
 * Supports strings (with optional min chars), arrays (with optional min length), and objects
 */
function hasValue(
  listing: Listing,
  key: keyof Listing,
  minChars?: number,
  minLength?: number
): boolean {
  const value = listing[key];

  // Null or undefined
  if (value === null || value === undefined) return false;

  // Array
  if (Array.isArray(value)) {
    const length = value.length;
    return minLength ? length >= minLength : length > 0;
  }

  // Object (check for non-empty values)
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return false;

    // For social_media, check if at least one value is non-empty
    const values = Object.values(value);
    const hasNonEmptyValue = values.some(v =>
      v !== null && v !== undefined && String(v).trim().length > 0
    );

    return minLength ? hasNonEmptyValue : keys.length > 0;
  }

  // String
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return minChars ? trimmed.length >= minChars : trimmed.length > 0;
  }

  // Number (for category_id, etc.)
  if (typeof value === 'number') return true;

  // Other types (booleans)
  return true;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculate listing completion percentage and missing fields
 *
 * @param listing - Listing data
 * @returns Completion result with percentage and missing fields
 */
export function calculateListingCompleteness(listing: Listing): ListingCompletionResult {
  // Check required fields
  const missingRequired: ListingField[] = [];
  let completedRequiredWeight = 0;

  for (const field of REQUIRED_FIELDS) {
    if (hasValue(listing, field.key, field.minChars, field.minLength)) {
      completedRequiredWeight += field.weight;
    } else {
      missingRequired.push(field);
    }
  }

  // Check optional fields
  const missingOptional: ListingField[] = [];
  let completedOptionalWeight = 0;

  for (const field of OPTIONAL_FIELDS) {
    if (hasValue(listing, field.key, field.minChars, field.minLength)) {
      completedOptionalWeight += field.weight;
    } else {
      missingOptional.push(field);
    }
  }

  // Calculate percentage
  const totalWeight = completedRequiredWeight + completedOptionalWeight;
  const percentage = Math.round(totalWeight * 100);

  return {
    percentage,
    missingRequired,
    missingOptional,
    completedRequired: REQUIRED_FIELDS.length - missingRequired.length,
    completedOptional: OPTIONAL_FIELDS.length - missingOptional.length,
    totalRequired: REQUIRED_FIELDS.length,
    totalOptional: OPTIONAL_FIELDS.length
  };
}

/**
 * Export field definitions for external use
 */
export function getListingFieldDefinitions() {
  return {
    required: REQUIRED_FIELDS,
    optional: OPTIONAL_FIELDS
  };
}
