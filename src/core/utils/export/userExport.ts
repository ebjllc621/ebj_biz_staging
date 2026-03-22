/**
 * User Export Utilities
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - PII security: NEVER exports password_hash, IP addresses, etc.
 * - TypeScript strict mode
 * - Exports ALL safe database fields per ImportExportModal.md
 *
 * DATABASE VERIFIED: 2026-02-01 - 49 total columns, 41 safe for export
 *
 * DO NOT EXPORT (8 security/internal fields):
 * - password_hash, password_changed_at, failed_login_attempts, locked_until
 * - deleted_at, email_normalized, last_ip_address, last_user_agent
 *
 * @tier ADVANCED
 * @phase Phase 6 - User Import/Export
 * @updated 2026-02-01 - Expanded to ALL 41 safe DB fields
 * @see docs/components/admin/categories/ImportExportModal.md
 */

import type { UserExportData } from '@core/types/import-export';

/**
 * User fields safe for export (excludes sensitive data)
 * DATABASE VERIFIED: 49 total columns - 8 sensitive = 41 safe fields
 */
const SAFE_EXPORT_FIELDS: (keyof UserExportData)[] = [
  // Primary identifiers (4 fields)
  'id',
  'uuid',
  'email',
  'username',

  // Name fields (3 fields)
  'first_name',
  'last_name',
  'display_name',

  // Contact (1 field)
  'contact_phone',

  // Profile (5 fields)
  'avatar_url',
  'avatar_bg_color',
  'bio',
  'occupation',
  'goals',
  'cover_image_url',

  // Location (3 fields)
  'city',
  'state',
  'country',

  // Status flags (5 fields)
  'is_active',
  'is_verified',
  'email_verified',
  'is_mock',
  'is_business_owner',

  // Role and status (4 fields)
  'role',
  'status',
  'user_group',
  'profile_visibility',

  // Timestamps (6 fields)
  'email_verified_at',
  'last_login_at',
  'last_login',
  'created_at',
  'updated_at',
  'terms_accepted_at',

  // Terms (1 field)
  'terms_version',

  // Settings - JSON (7 fields)
  'permissions',
  'privacy_settings',
  'interests',
  'social_links',
  'visibility_settings',
  'connection_privacy',
  'user_preferences',

  // Metrics (1 field)
  'login_count'
];

/**
 * Fields to exclude from SQL INSERT (auto-generated or export-only)
 */
const SQL_EXCLUDE_FIELDS: (keyof UserExportData)[] = [
  'id',
  'uuid',
  'created_at',
  'updated_at',
  'last_login_at',
  'last_login',
  'email_verified_at',
  'login_count'
];

/**
 * Sanitize user object for export (remove sensitive fields)
 */
function sanitizeUserForExport(user: Partial<UserExportData> & { [key: string]: unknown }): UserExportData {
  const sanitized: Partial<UserExportData> = {};

  for (const field of SAFE_EXPORT_FIELDS) {
    if (field in user) {
      const value = (user as Record<string, unknown>)[field];
      // Handle JSON fields - stringify if object
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[field] = JSON.stringify(value);
      } else {
        (sanitized as Record<string, unknown>)[field] = value;
      }
    }
  }

  return sanitized as UserExportData;
}

/**
 * Generate JSON export for users
 */
export function generateUserJSONExport(users: Array<Partial<UserExportData> & { [key: string]: unknown }>): string {
  const sanitized = users.map(sanitizeUserForExport);
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Generate CSV export for users
 */
export function generateUserCSVExport(users: Array<Partial<UserExportData> & { [key: string]: unknown }>): string {
  const sanitized = users.map(sanitizeUserForExport);

  if (sanitized.length === 0) {
    // Return header row even for empty export (shows expected format)
    return SAFE_EXPORT_FIELDS.join(',');
  }

  const headers = SAFE_EXPORT_FIELDS.join(',');
  const rows = sanitized.map(user => {
    return SAFE_EXPORT_FIELDS.map(field => {
      const value = user[field];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const escaped = value.replace(/"/g, '""');
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${escaped}"`
          : escaped;
      }
      // Handle objects (JSON fields)
      if (typeof value === 'object') {
        const jsonStr = JSON.stringify(value);
        return `"${jsonStr.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Generate SQL export for users
 */
export function generateUserSQLExport(users: Array<Partial<UserExportData> & { [key: string]: unknown }>): string {
  const sanitized = users.map(sanitizeUserForExport);

  if (sanitized.length === 0) {
    return '-- No users to export';
  }

  const lines = [
    '-- User Export',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Total: ${sanitized.length} users`,
    '',
    '-- NOTE: Password hashes are NOT included for security.',
    '-- Imported users will need to reset their passwords.',
    '-- Sensitive fields (IP addresses, login attempts) are excluded.',
    ''
  ];

  // Get fields for SQL insert (exclude auto-generated fields)
  const sqlFields = SAFE_EXPORT_FIELDS.filter(f => !SQL_EXCLUDE_FIELDS.includes(f));

  sanitized.forEach(user => {
    const values = sqlFields.map(field => {
      const value = user[field];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'boolean') return value ? '1' : '0';
      if (typeof value === 'number') return String(value);
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      // Handle objects (JSON fields)
      if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      }
      return String(value);
    });

    lines.push(
      `INSERT INTO users (${sqlFields.join(', ')}) VALUES (${values.join(', ')});`
    );
  });

  return lines.join('\n');
}
