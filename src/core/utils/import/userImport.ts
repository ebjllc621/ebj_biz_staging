/**
 * User Import Parse Utilities
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier
 * - TypeScript strict mode
 * - Supports ALL safe database fields per ImportExportModal.md
 *
 * DATABASE VERIFIED: 2026-02-01 - 49 total columns, 32 importable fields
 *
 * @tier ADVANCED
 * @phase Phase 6 - User Import/Export
 * @updated 2026-02-01 - Expanded to ALL 32 importable DB fields
 * @see docs/components/admin/categories/ImportExportModal.md
 */

import type { ImportUserInput } from '@core/types/import-export';

/**
 * Parse JSON content to user import data
 */
export function parseUserJSONImport(content: string): ImportUserInput[] {
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error('JSON content must be an array');
  }

  return parsed.map((item, index) => normalizeUserInput(item, index + 1));
}

/**
 * Parse CSV content to user import data
 */
export function parseUserCSVImport(content: string): ImportUserInput[] {
  const lines = content.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error('CSV must have header row and at least one data row');
  }

  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error('CSV header is empty');
  }

  const headers = parseCSVLine(firstLine).map(h => h.toLowerCase().trim());
  const emailIndex = headers.indexOf('email');

  if (emailIndex === -1) {
    throw new Error('CSV must have "email" column');
  }

  const users: ImportUserInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const values = parseCSVLine(line);
    const record: Record<string, string> = {};

    headers.forEach((header, idx) => {
      if (values[idx] !== undefined) {
        record[header] = values[idx];
      }
    });

    users.push(normalizeUserInput(record, i + 1));
  }

  return users;
}

/**
 * Parse SQL content to user import data
 */
export function parseUserSQLImport(content: string): ImportUserInput[] {
  const insertRegex = /INSERT\s+INTO\s+users\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
  const users: ImportUserInput[] = [];
  let match;
  let rowNum = 0;

  while ((match = insertRegex.exec(content)) !== null) {
    rowNum++;
    const columnsStr = match[1];
    const valuesStr = match[2];

    if (!columnsStr || !valuesStr) continue;

    const columns = columnsStr.split(',').map(c => c.trim().toLowerCase());
    const values = parseSQLValues(valuesStr);

    const record: Record<string, string | null> = {};
    columns.forEach((col, idx) => {
      record[col] = values[idx] ?? null;
    });

    users.push(normalizeUserInput(record, rowNum));
  }

  if (users.length === 0) {
    throw new Error('No valid INSERT INTO users statements found');
  }

  return users;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse SQL VALUES clause
 */
function parseSQLValues(valuesStr: string): (string | null)[] {
  const values: (string | null)[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (char === "'" && !inQuotes) {
      inQuotes = true;
    } else if (char === "'" && inQuotes) {
      if (valuesStr[i + 1] === "'") {
        current += "'";
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(normalizeValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  values.push(normalizeValue(current.trim()));
  return values;
}

/**
 * Normalize SQL value (handle NULL, quotes)
 */
function normalizeValue(value: string): string | null {
  if (value.toUpperCase() === 'NULL') return null;
  return value;
}

/**
 * Normalize raw import data to ImportUserInput
 * DATABASE VERIFIED: Supports ALL 32 importable database fields
 */
function normalizeUserInput(raw: Record<string, unknown>, _rowNum: number): ImportUserInput {
  const getString = (val: unknown): string | null => {
    if (val === null || val === undefined || val === '') return null;
    return String(val).trim();
  };

  const getBoolean = (val: unknown): boolean => {
    if (val === true || val === 1 || val === '1' || val === 'true' || val === 'TRUE') return true;
    return false;
  };

  const getJSON = (val: unknown): Record<string, unknown> | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'object' && val !== null) return val as Record<string, unknown>;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return null;
  };

  const email = getString(raw.email) || '';
  const username = getString(raw.username) || email.split('@')[0] || '';

  // Normalize role - map 'user' to 'general' for backwards compatibility
  let role = getString(raw.role);
  if (role === 'user') role = 'general';
  if (role && !['general', 'listing_member', 'admin'].includes(role)) {
    role = 'general';
  }

  // Normalize profile_visibility
  let profileVisibility = getString(raw.profile_visibility);
  if (profileVisibility && !['public', 'connections', 'private'].includes(profileVisibility)) {
    profileVisibility = 'public';
  }

  return {
    email,
    username,

    // Name fields (3)
    first_name: getString(raw.first_name),
    last_name: getString(raw.last_name),
    display_name: getString(raw.display_name),

    // Contact (1)
    contact_phone: getString(raw.contact_phone),

    // Profile (5)
    avatar_url: getString(raw.avatar_url),
    avatar_bg_color: getString(raw.avatar_bg_color),
    bio: getString(raw.bio),
    occupation: getString(raw.occupation),
    goals: getString(raw.goals),
    cover_image_url: getString(raw.cover_image_url),

    // Location (3)
    city: getString(raw.city),
    state: getString(raw.state),
    country: getString(raw.country),

    // Status flags (4)
    is_active: raw.is_active !== undefined ? getBoolean(raw.is_active) : true,
    is_verified: getBoolean(raw.is_verified),
    is_mock: getBoolean(raw.is_mock),
    is_business_owner: getBoolean(raw.is_business_owner),

    // Role and status (4)
    role: (role as 'general' | 'listing_member' | 'admin') || 'general',
    status: (getString(raw.status) as 'active' | 'suspended' | 'banned' | 'pending' | 'deleted') || 'active',
    user_group: getString(raw.user_group),
    profile_visibility: (profileVisibility as 'public' | 'connections' | 'private') || null,

    // Terms (2)
    terms_accepted_at: getString(raw.terms_accepted_at),
    terms_version: getString(raw.terms_version),

    // Settings - JSON fields (7)
    permissions: getJSON(raw.permissions),
    privacy_settings: getJSON(raw.privacy_settings),
    interests: getJSON(raw.interests),
    social_links: getJSON(raw.social_links),
    visibility_settings: getJSON(raw.visibility_settings),
    connection_privacy: getJSON(raw.connection_privacy),
    user_preferences: getJSON(raw.user_preferences)
  };
}
