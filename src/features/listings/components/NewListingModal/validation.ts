/**
 * NewListingModal - Validation Framework
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @pattern Per-section validation (scaffolded for future phases)
 * @tier ENTERPRISE
 * @phase Phase 1 - Foundation
 */

/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import type { ListingFormData, TierLimits } from '../../types/listing-form.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// SECTION VALIDATORS
// ============================================================================

export function validateSection1(data: ListingFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.tier) {
    errors.tier = 'Please select a membership tier';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSection2(data: ListingFormData, limits: TierLimits): ValidationResult {
  // Placeholder - implemented in Phase 3
  return { valid: true, errors: {} };
}

export function validateSection3(data: ListingFormData): ValidationResult {
  // Placeholder - implemented in Phase 4
  return { valid: true, errors: {} };
}

export function validateSection4(data: ListingFormData): ValidationResult {
  // Placeholder - implemented in Phase 4
  return { valid: true, errors: {} };
}

export function validateSection5(data: ListingFormData): ValidationResult {
  // Placeholder - implemented in Phase 5
  return { valid: true, errors: {} };
}

export function validateSection6(data: ListingFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // Meta title - optional but if provided, must be ≤60 chars
  if (data.metaTitle && data.metaTitle.length > 60) {
    errors.metaTitle = 'Meta title must be 60 characters or less';
  }

  // Meta description - optional but if provided, must be ≤160 chars
  if (data.metaDescription && data.metaDescription.length > 160) {
    errors.metaDescription = 'Meta description must be 160 characters or less';
  }

  // Meta keywords - optional but if provided, must be ≤250 chars
  if (data.metaKeywords && data.metaKeywords.length > 250) {
    errors.metaKeywords = 'Meta keywords must be 250 characters or less';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateSection7(data: ListingFormData): ValidationResult {
  const errors: Record<string, string> = {};

  // User role is required
  if (!data.userRole) {
    errors.userRole = 'Please select your role';
  }

  // If role is "user" (Select User), owner info is required
  if (data.userRole === 'user') {
    if (!data.ownerName || data.ownerName.trim() === '') {
      errors.ownerName = 'Contact person name is required';
    }

    if (!data.ownerEmail || data.ownerEmail.trim() === '') {
      errors.ownerEmail = 'Contact person email is required';
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.ownerEmail)) {
        errors.ownerEmail = 'Please enter a valid email address';
      }
    }

    if (!data.ownerPhone || data.ownerPhone.trim() === '') {
      errors.ownerPhone = 'Contact person phone is required';
    }
  }

  // Terms must be accepted
  if (!data.termsAccepted) {
    errors.termsAccepted = 'You must accept the terms and conditions';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ============================================================================
// ALL SECTIONS VALIDATOR
// ============================================================================

export function validateAllSections(data: ListingFormData, limits: TierLimits): {
  valid: boolean;
  sectionErrors: Map<number, ValidationResult>;
} {
  const validators = [
    validateSection1,
    (d: ListingFormData) => validateSection2(d, limits),
    validateSection3,
    validateSection4,
    validateSection5,
    validateSection6,
    validateSection7
  ];

  const sectionErrors = new Map<number, ValidationResult>();
  let allValid = true;

  validators.forEach((validator, index) => {
    const result = validator(data);
    sectionErrors.set(index + 1, result);
    if (!result.valid) allValid = false;
  });

  return { valid: allValid, sectionErrors };
}
