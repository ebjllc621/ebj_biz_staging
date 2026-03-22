/**
 * Import/Export Types - Generic data portability interfaces
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ADVANCED tier patterns
 * - Reusable across all admin pages
 * - TypeScript strict mode compliance
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 * @dna-version 11.4.0
 * @phase 5
 *
 * @see docs/pages/layouts/admin/pageTables/categories/phases/PHASE_5_BRAIN_PLAN.md
 */

// ============================================================================
// Export Types
// ============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'csv' | 'sql';

/**
 * Export options for service layer export methods
 */
export interface ExportOptions {
  /** Include inactive records (default: true) */
  includeInactive?: boolean;
  /** Export as hierarchical tree (JSON only, default: true) */
  hierarchical?: boolean;
  /** Record IDs to export (default: all) */
  ids?: number[];
}

// ============================================================================
// Import Types
// ============================================================================

/**
 * Import category input (parsed from file)
 */
export interface ImportCategoryInput {
  /** Original ID from import file (for reference matching) */
  importId?: number;
  /** Category name (REQUIRED) */
  name: string;
  /** URL slug (auto-generated if not provided) */
  slug?: string;
  /** Description */
  description?: string | null;
  /** Alternative description */
  cat_description?: string | null;
  /** Keywords array */
  keywords?: string[] | null;
  /** Parent ID (reference to importId or existing ID) */
  parent_id?: number | null;
  /** Sort order */
  sort_order?: number;
  /** Active status */
  is_active?: boolean;
}

/**
 * Import conflict detection result
 */
export interface ImportConflict {
  /** Slug that conflicts */
  slug: string;
  /** Existing record ID with this slug */
  existingId: number;
  /** Existing record name */
  existingName: string;
  /** Import row name */
  importName: string;
  /** Row number in import file (1-indexed) */
  importRow: number;
}

/**
 * Import validation error
 */
export interface ImportError {
  /** Row number in import file (1-indexed) */
  row: number;
  /** Field with error */
  field: string;
  /** Error message */
  message: string;
}

/**
 * Import preview result (from /api/admin/categories/import/preview)
 */
export interface ImportPreviewResult {
  /** Total records in import file */
  total: number;
  /** Valid records (no errors) */
  valid: number;
  /** Records with slug conflicts */
  conflicts: ImportConflict[];
  /** Validation errors */
  errors: ImportError[];
  /** Preview data (first 100 rows) */
  preview: ImportCategoryInput[];
}

/**
 * Conflict resolution strategy
 *
 * - skip: Don't import conflicting records
 * - overwrite: Replace existing record with import data
 * - rename: Create new record with modified identifier
 * - update_existing: Merge - only update fields with non-empty values in import,
 *                    preserve existing values for empty fields
 */
export type ConflictResolution = 'skip' | 'overwrite' | 'rename' | 'update_existing';

/**
 * Skipped record details for import tracking
 */
export interface SkippedRecord {
  /** Row number in import file (1-indexed) */
  row: number;
  /** Name/identifier of the skipped record */
  name: string;
  /** Reason the record was skipped */
  reason: string;
}

/**
 * Import execution result (from /api/admin/categories/import)
 */
export interface ImportResult {
  /** Successfully imported (new) */
  imported: number;
  /** Updated (overwrite resolution) */
  updated: number;
  /** Skipped (skip resolution or errors) */
  skipped: number;
  /** Renamed (rename resolution) */
  renamed: number;
  /** Errors during import */
  errors: ImportError[];
  /** Detailed list of skipped records with reasons */
  skippedRecords?: SkippedRecord[];
}

// ============================================================================
// CSV-Specific Types
// ============================================================================

/**
 * CSV column mapping (for non-standard column names)
 */
export interface CSVColumnMapping {
  [csvColumnName: string]: keyof ImportCategoryInput;
}

/**
 * CSV parsing options
 */
export interface CSVParseOptions {
  /** Column delimiter (auto-detected if not provided) */
  delimiter?: ',' | ';' | '\t';
  /** First row is header (default: true) */
  hasHeader?: boolean;
  /** Column mapping (if headers don't match field names) */
  mapping?: CSVColumnMapping;
}

// ============================================================================
// User Import/Export Types (Phase 6)
// ============================================================================

/**
 * User export data structure (excludes sensitive fields)
 *
 * REQUIREMENT: Export ALL safe database fields per ImportExportModal.md
 * DATABASE VERIFIED: 2026-02-01 - 49 total columns, 41 safe for export
 *
 * DO NOT EXPORT (8 sensitive/internal fields):
 * - password_hash, password_changed_at, failed_login_attempts, locked_until
 * - deleted_at, email_normalized, last_ip_address, last_user_agent
 *
 * @see docs/components/admin/categories/ImportExportModal.md - CRITICAL REQUIREMENTS
 * @updated 2026-02-01 - Expanded to include ALL 41 safe DB fields
 */
export interface UserExportData {
  // Primary identifiers (4 fields)
  /** User ID (export reference only, ignored on import) */
  id?: number;
  /** UUID */
  uuid?: string | null;
  /** Email address (REQUIRED, unique key for conflict detection) */
  email: string;
  /** Username (REQUIRED, unique) */
  username: string;

  // Name fields (3 fields)
  /** First name */
  first_name?: string | null;
  /** Last name */
  last_name?: string | null;
  /** Display name */
  display_name?: string | null;

  // Contact (1 field)
  /** Contact phone number */
  contact_phone?: string | null;

  // Profile (5 fields)
  /** Avatar URL */
  avatar_url?: string | null;
  /** Avatar background color (hex) */
  avatar_bg_color?: string | null;
  /** User bio */
  bio?: string | null;
  /** Occupation */
  occupation?: string | null;
  /** Goals */
  goals?: string | null;
  /** Cover image URL */
  cover_image_url?: string | null;

  // Location (3 fields)
  /** City */
  city?: string | null;
  /** State */
  state?: string | null;
  /** Country */
  country?: string | null;

  // Status flags (5 fields)
  /** Is account active */
  is_active?: boolean;
  /** Email verified status */
  is_verified?: boolean;
  /** Email verified (duplicate flag for compatibility) */
  email_verified?: boolean;
  /** Is mock/test user */
  is_mock?: boolean;
  /** Is business owner */
  is_business_owner?: boolean;

  // Role and status (4 fields)
  /** User role: general, listing_member, admin */
  role?: 'general' | 'listing_member' | 'admin';
  /** Account status */
  status?: 'active' | 'suspended' | 'banned' | 'pending' | 'deleted';
  /** User group */
  user_group?: string | null;
  /** Profile visibility */
  profile_visibility?: 'public' | 'connections' | 'private' | null;

  // Timestamps (6 fields - export only)
  /** Email verified at */
  email_verified_at?: string | null;
  /** Last login at */
  last_login_at?: string | null;
  /** Last login (duplicate for compatibility) */
  last_login?: string | null;
  /** Created timestamp */
  created_at?: string;
  /** Updated timestamp */
  updated_at?: string;
  /** Terms accepted at */
  terms_accepted_at?: string | null;

  // Terms (1 field)
  /** Terms version accepted */
  terms_version?: string | null;

  // Settings - JSON fields (7 fields)
  /** User permissions */
  permissions?: Record<string, unknown> | string | null;
  /** Privacy settings */
  privacy_settings?: Record<string, unknown> | string | null;
  /** User interests */
  interests?: Record<string, unknown> | string[] | string | null;
  /** Social links */
  social_links?: Record<string, unknown> | string | null;
  /** Visibility settings */
  visibility_settings?: Record<string, unknown> | string | null;
  /** Connection privacy */
  connection_privacy?: Record<string, unknown> | string | null;
  /** User preferences */
  user_preferences?: Record<string, unknown> | string | null;

  // Metrics (1 field - export only)
  /** Login count */
  login_count?: number;
}

/**
 * User import input (parsed from file) - ALL safe database fields
 *
 * DATABASE VERIFIED: 2026-02-01 - 49 total columns, 32 importable fields
 * (excludes auto-generated: id, uuid, created_at, updated_at, timestamps, metrics)
 *
 * IMPORT DEFAULTS:
 * - role: 'general'
 * - status: 'active'
 * - is_active: true
 * - is_verified: false
 * - is_mock: false
 * - is_business_owner: false
 * - profile_visibility: 'public'
 *
 * @see docs/components/admin/categories/ImportExportModal.md
 * @updated 2026-02-01 - Expanded to include ALL 32 importable DB fields
 */
export interface ImportUserInput {
  /** Original ID from import file (for reference only) */
  importId?: number;

  // Primary (REQUIRED)
  /** Email address (REQUIRED) */
  email: string;
  /** Username (auto-generated from email if not provided) */
  username?: string;

  // Name fields (3 fields)
  /** First name */
  first_name?: string | null;
  /** Last name */
  last_name?: string | null;
  /** Display name */
  display_name?: string | null;

  // Contact (1 field)
  /** Contact phone number */
  contact_phone?: string | null;

  // Profile (5 fields)
  /** Avatar URL */
  avatar_url?: string | null;
  /** Avatar background color (hex) */
  avatar_bg_color?: string | null;
  /** User bio */
  bio?: string | null;
  /** Occupation */
  occupation?: string | null;
  /** Goals */
  goals?: string | null;
  /** Cover image URL */
  cover_image_url?: string | null;

  // Location (3 fields)
  /** City */
  city?: string | null;
  /** State */
  state?: string | null;
  /** Country */
  country?: string | null;

  // Status flags (4 fields)
  /** Is account active (default: true) */
  is_active?: boolean;
  /** Email verified status (default: false) */
  is_verified?: boolean;
  /** Is mock/test user (default: false) */
  is_mock?: boolean;
  /** Is business owner (default: false) */
  is_business_owner?: boolean;

  // Role and status (4 fields)
  /** User role: general, listing_member, admin (default: 'general') */
  role?: 'general' | 'listing_member' | 'admin';
  /** Account status (default: 'active') */
  status?: 'active' | 'suspended' | 'banned' | 'pending' | 'deleted';
  /** User group */
  user_group?: string | null;
  /** Profile visibility (default: 'public') */
  profile_visibility?: 'public' | 'connections' | 'private' | null;

  // Terms (2 fields)
  /** Terms accepted at */
  terms_accepted_at?: string | null;
  /** Terms version accepted */
  terms_version?: string | null;

  // Settings - JSON fields (7 fields)
  /** User permissions */
  permissions?: Record<string, unknown> | string | null;
  /** Privacy settings */
  privacy_settings?: Record<string, unknown> | string | null;
  /** User interests */
  interests?: Record<string, unknown> | string[] | string | null;
  /** Social links */
  social_links?: Record<string, unknown> | string | null;
  /** Visibility settings */
  visibility_settings?: Record<string, unknown> | string | null;
  /** Connection privacy */
  connection_privacy?: Record<string, unknown> | string | null;
  /** User preferences */
  user_preferences?: Record<string, unknown> | string | null;
}

/**
 * User import conflict (email-based)
 */
export interface UserImportConflict {
  /** Email that conflicts */
  email: string;
  /** Existing user ID with this email */
  existingId: number;
  /** Existing username */
  existingUsername: string;
  /** Import row username */
  importUsername: string;
  /** Row number in import file (1-indexed) */
  importRow: number;
}

/**
 * User import preview result
 */
export interface UserImportPreviewResult {
  /** Total records in import file */
  total: number;
  /** Valid records (no errors) */
  valid: number;
  /** Records with email conflicts */
  conflicts: UserImportConflict[];
  /** Validation errors */
  errors: ImportError[];
  /** Preview data (first 100 rows) */
  preview: ImportUserInput[];
}

// ============================================================================
// Listing Import/Export Types (Phase 7)
// ============================================================================

/**
 * Listing export data structure - ALL 58 database fields
 *
 * REQUIREMENT: Export must include ALL fields from the listings database table,
 * not just the columns displayed in the admin table view.
 *
 * @see docs/components/admin/categories/ImportExportModal.md - CRITICAL REQUIREMENTS
 * @updated 2026-02-01 - Expanded to include ALL DB fields
 */
export interface ListingExportData {
  // Primary identifiers
  id?: number;
  user_id?: number | null;
  name: string;
  slug?: string;

  // Basic information
  description?: string | null;
  type?: string;
  year_established?: number | null;
  employee_count?: number | null;

  // Contact information
  email?: string | null;
  phone?: string | null;
  website?: string | null;

  // Location
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Category
  category_id?: number | null;
  category_name?: string | null;
  owner_email?: string | null;

  // Media
  logo_url?: string | null;
  cover_image_url?: string | null;
  gallery_images?: string[] | string | null;
  video_url?: string | null;
  audio_url?: string | null;

  // Business details (JSON fields)
  business_hours?: Record<string, unknown> | string | null;
  social_media?: Record<string, unknown> | string | null;
  features?: string[] | string | null;
  amenities?: string[] | string | null;

  // Subscription
  tier?: 'essentials' | 'plus' | 'preferred' | 'premium';
  add_ons?: string[] | string | null;

  // Status flags
  claimed?: boolean;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  approved?: 'pending' | 'approved' | 'rejected' | 'pending_claim';
  mock?: boolean;

  // SEO
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;

  // Custom data (JSON fields)
  custom_fields?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown> | string | null;

  // Contact person
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;

  // Business metrics
  annual_revenue?: number | null;
  certifications?: string[] | string | null;
  languages_spoken?: string[] | string | null;
  payment_methods?: string[] | string | null;

  // Analytics
  view_count?: number;
  click_count?: number;
  favorite_count?: number;

  // Import tracking
  import_source?: string | null;
  import_date?: string | null;
  import_batch_id?: string | null;

  // Additional fields
  keywords?: string[] | string | null; // DB has json_valid() constraint - stored as JSON array
  slogan?: string | null;

  // Timestamps
  date_created?: string | null;
  last_update?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Listing import input (parsed from file) - ALL database fields
 *
 * IMPORT DEFAULTS (per ImportExportModal.md):
 * - claimed: false (unclaimed) - UNLESS updating existing claimed record
 * - approved: 'pending' - UNLESS updating existing approved listing
 * - mock: false (live data)
 * - status: 'active' - unless specified in import
 *
 * @see docs/components/admin/categories/ImportExportModal.md - Listings Import Default Values
 */
export interface ImportListingInput {
  importId?: number;
  name: string;
  slug?: string;
  type?: string;
  tier?: 'essentials' | 'plus' | 'preferred' | 'premium';
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  approved?: 'pending' | 'approved' | 'rejected';
  owner_email?: string;
  category_id?: number | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  add_ons?: string[] | string | null;
  claimed?: boolean;
  mock?: boolean;

  // Extended fields for full DB coverage
  user_id?: number | null;
  year_established?: number | null;
  employee_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  gallery_images?: string[] | string | null;
  video_url?: string | null;
  audio_url?: string | null;
  business_hours?: Record<string, unknown> | string | null;
  social_media?: Record<string, unknown> | string | null;
  features?: string[] | string | null;
  amenities?: string[] | string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  custom_fields?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown> | string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  annual_revenue?: number | null;
  certifications?: string[] | string | null;
  languages_spoken?: string[] | string | null;
  payment_methods?: string[] | string | null;
  keywords?: string[] | string | null; // DB has json_valid() constraint - stored as JSON array
  slogan?: string | null;
}

/**
 * Listing import conflict (name/slug-based with address awareness)
 *
 * Address-Aware Duplicate Detection Logic:
 * - Same name + same address = TRUE duplicate
 * - Same name + different address = Franchise location (NOT duplicate)
 * - Same slug + same address = TRUE duplicate
 * - Same slug + different address = Potential rename needed
 *
 * @updated 2026-02-02 - Added address-aware duplicate detection
 */
export interface ListingImportConflict {
  identifier: string;
  type: 'name' | 'slug' | 'name_and_address';
  existingId: number;
  existingName: string;
  existingAddress?: string | null;
  importName: string;
  importAddress?: string | null;
  importRow: number;
  /** Indicates if this is a true duplicate vs potential franchise */
  isTrueDuplicate: boolean;
  /** Reason for conflict classification */
  reason: string;
}

/**
 * Listing import preview result
 */
export interface ListingImportPreviewResult {
  total: number;
  valid: number;
  conflicts: ListingImportConflict[];
  errors: ImportError[];
  preview: ImportListingInput[];
}
