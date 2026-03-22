/**
 * Profile Completion Calculation Utility
 *
 * Calculates profile completion percentage based on required and optional fields.
 * Uses weighted scoring: 70% required fields, 30% optional fields.
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/PHASE_4_REMEDIATION_BRAIN_PLAN.md
 * @tier UTILITY
 * @generated DNA v11.4.0
 */

import { PublicProfile } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProfileCompletionResult {
  /** Overall completion percentage (0-100) */
  percentage: number;
  /** Missing required fields */
  missingRequired: ProfileField[];
  /** Missing optional fields */
  missingOptional: ProfileField[];
  /** Completed required fields count */
  completedRequired: number;
  /** Completed optional fields count */
  completedOptional: number;
  /** Total required fields */
  totalRequired: number;
  /** Total optional fields */
  totalOptional: number;
}

export interface ProfileField {
  /** Field key */
  key: keyof PublicProfile;
  /** Display label */
  label: string;
  /** Weight towards completion (0-1) */
  weight: number;
  /** Whether this is a required field */
  required: boolean;
}

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

/**
 * Required fields (70% of total completion)
 */
const REQUIRED_FIELDS: ProfileField[] = [
  { key: 'display_name', label: 'Display Name', weight: 0.10, required: true },
  { key: 'bio', label: 'Bio', weight: 0.25, required: true },
  { key: 'avatar_url', label: 'Profile Photo', weight: 0.15, required: true },
  { key: 'occupation', label: 'Occupation', weight: 0.15, required: true },
  { key: 'social_links', label: 'Social Links', weight: 0.05, required: true }
];

/**
 * Optional fields (30% of total completion)
 */
const OPTIONAL_FIELDS: ProfileField[] = [
  { key: 'goals', label: 'Goals', weight: 0.10, required: false },
  { key: 'city', label: 'City', weight: 0.05, required: false },
  { key: 'state', label: 'State', weight: 0.05, required: false },
  { key: 'cover_image_url', label: 'Cover Image', weight: 0.10, required: false }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a profile field has a non-empty value
 */
function hasValue(profile: PublicProfile, key: keyof PublicProfile): boolean {
  const value = profile[key];

  // Null or undefined
  if (value === null || value === undefined) return false;

  // Array
  if (Array.isArray(value)) return value.length > 0;

  // Object
  if (typeof value === 'object') return Object.keys(value).length > 0;

  // String
  if (typeof value === 'string') return value.trim().length > 0;

  // Other types (numbers, booleans)
  return true;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculate profile completion percentage and missing fields
 *
 * @param profile - User's public profile data
 * @returns Completion result with percentage and missing fields
 */
export function calculateProfileCompletion(profile: PublicProfile): ProfileCompletionResult {
  // Check required fields
  const missingRequired: ProfileField[] = [];
  let completedRequiredWeight = 0;

  for (const field of REQUIRED_FIELDS) {
    if (hasValue(profile, field.key)) {
      completedRequiredWeight += field.weight;
    } else {
      missingRequired.push(field);
    }
  }

  // Check optional fields
  const missingOptional: ProfileField[] = [];
  let completedOptionalWeight = 0;

  for (const field of OPTIONAL_FIELDS) {
    if (hasValue(profile, field.key)) {
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
