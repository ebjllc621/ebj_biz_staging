/**
 * User Import Validation Utilities
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - TypeScript strict mode
 * - PII security enforcement
 * - Validates ALL safe database fields per ImportExportModal.md
 *
 * @tier ADVANCED
 * @phase Phase 6 - User Import/Export
 * @updated 2026-02-01 - Expanded field validation
 * @see docs/components/admin/categories/ImportExportModal.md
 */

import type { ImportUserInput, ImportError } from '@core/types/import-export';

/**
 * Valid user roles in database
 */
const VALID_ROLES = ['general', 'listing_member', 'admin'];

/**
 * Valid user statuses in database
 */
const VALID_STATUSES = ['active', 'suspended', 'banned', 'pending', 'deleted'];

/**
 * Validate user import data
 * @param users Parsed user data from file
 * @returns Array of validation errors
 */
export function validateUserImport(users: ImportUserInput[]): ImportError[] {
  const errors: ImportError[] = [];
  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();

  users.forEach((user, index) => {
    const row = index + 1; // 1-indexed for user display

    // Required field: email
    if (!user.email || typeof user.email !== 'string' || !user.email.trim()) {
      errors.push({
        row,
        field: 'email',
        message: 'Email is required'
      });
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email.trim())) {
        errors.push({
          row,
          field: 'email',
          message: `Invalid email format: ${user.email}`
        });
      }

      // Duplicate email detection within file (duplication guarding)
      const normalizedEmail = user.email.trim().toLowerCase();
      if (seenEmails.has(normalizedEmail)) {
        errors.push({
          row,
          field: 'email',
          message: `Duplicate email in file: ${user.email}`
        });
      }
      seenEmails.add(normalizedEmail);
    }

    // Username validation (if provided)
    if (user.username) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(user.username)) {
        errors.push({
          row,
          field: 'username',
          message: `Invalid username format: ${user.username}. Only letters, numbers, and underscores allowed.`
        });
      } else if (user.username.length < 3) {
        errors.push({
          row,
          field: 'username',
          message: `Username too short: ${user.username}. Minimum 3 characters.`
        });
      }

      // Duplicate username detection within file (duplication guarding)
      const normalizedUsername = user.username.trim().toLowerCase();
      if (seenUsernames.has(normalizedUsername)) {
        errors.push({
          row,
          field: 'username',
          message: `Duplicate username in file: ${user.username}`
        });
      }
      seenUsernames.add(normalizedUsername);
    }

    // Role validation - use correct database enum values
    // Note: 'user' role is normalized to 'general' in userImport.ts during parsing
    if (user.role && !VALID_ROLES.includes(user.role)) {
      errors.push({
        row,
        field: 'role',
        message: `Invalid role: ${user.role}. Must be 'general', 'listing_member', or 'admin'.`
      });
    }

    // Status validation
    if (user.status && !VALID_STATUSES.includes(user.status)) {
      errors.push({
        row,
        field: 'status',
        message: `Invalid status: ${user.status}. Must be 'active', 'suspended', 'banned', 'pending', or 'deleted'.`
      });
    }

    // Avatar URL validation (if provided)
    if (user.avatar_url) {
      // Basic URL validation - allow data URIs and http(s) URLs
      const urlRegex = /^(https?:\/\/|data:image\/)/i;
      if (!urlRegex.test(user.avatar_url)) {
        errors.push({
          row,
          field: 'avatar_url',
          message: `Invalid avatar URL format: must be http(s):// or data:image/ URI`
        });
      }
    }

    // Permissions validation (if provided) - must be valid JSON object
    if (user.permissions !== null && user.permissions !== undefined) {
      if (typeof user.permissions !== 'object') {
        errors.push({
          row,
          field: 'permissions',
          message: 'Permissions must be a valid JSON object'
        });
      }
    }

    // Privacy settings validation (if provided) - must be valid JSON object
    if (user.privacy_settings !== null && user.privacy_settings !== undefined) {
      if (typeof user.privacy_settings !== 'object') {
        errors.push({
          row,
          field: 'privacy_settings',
          message: 'Privacy settings must be a valid JSON object'
        });
      }
    }
  });

  return errors;
}
