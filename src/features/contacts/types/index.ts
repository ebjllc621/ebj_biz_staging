/**
 * Contact System Types
 * Phase A - Core Contacts Display
 * Phase B - CRM Features (Extended)
 * Phase C - Manual Contacts (Non-Connected Leads)
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_C_MANUAL_CONTACTS_BRAIN_PLAN.md
 * @authority CLAUDE.md - DNA Reference Injection Protocol
 *
 * Contact = Connection OR Manual Contact with CRM features
 * Uses user_connection table + user_contacts table (Phase B+C)
 */

/**
 * Contact source - How the contact was added
 * Phase C: Extended for manual contacts
 */
export type ContactSource =
  | 'connection'       // Auto-created from connection (Phase A/B)
  | 'listing_inquiry'  // From listing inquiry (Phase C)
  | 'event'            // Met at event (Phase C)
  | 'referral'         // Referred by someone (Phase C)
  | 'import'           // Imported from file (Phase D future)
  | 'manual';          // Manually added (Phase C)

/**
 * Contact - Connection OR Manual Contact with personal CRM data
 * Phase A: Basic connection data from user_connection
 * Phase B: CRM fields from user_contacts (notes, tags, reminders)
 * Phase C: Manual contact fields (contact_name, contact_email, etc.)
 */
export interface Contact {
  // Phase A: From user_connection table
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  avatar_bg_color: string | null;
  connection_type: string | null;
  connected_since: Date;
  mutual_connections: number;
  interaction_count: number;
  last_interaction: Date | null;
  is_connected: boolean; // true for connections, false for manual contacts (Phase C)

  // Phase C: Manual contact fields
  contact_name: string | null;    // For manual contacts
  contact_email: string | null;   // For manual contacts
  contact_phone: string | null;   // For manual contacts
  contact_company: string | null; // For manual contacts
  contact_address: string | null; // For manual contacts
  contact_social_links: ContactSocialLinks | null; // Social links
  source: ContactSource;          // How contact was added
  source_details: string | null;  // Additional source info

  // Phase B: From user_contacts table (CRM fields)
  notes: string | null;
  tags: string[] | null;
  category: ContactCategory | null;
  priority: ContactPriority | null;
  follow_up_date: Date | null;
  follow_up_note: string | null;
  last_contacted_at: Date | null;
  is_starred: boolean;
  is_archived: boolean;
}

/**
 * Contact categories for organization
 */
/**
 * Social links for contacts
 */
export interface ContactSocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  bizconekt?: string;
  website?: string;
}

export type ContactCategory = 'client' | 'partner' | 'lead' | 'friend' | 'other';

/**
 * Contact priority levels
 */
export type ContactPriority = 'high' | 'medium' | 'low';

/**
 * Sort options for contacts list
 * Phase B: Extended with CRM sorting
 */
export type ContactSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'connected_date_newest'
  | 'connected_date_oldest'
  | 'last_interaction'
  | 'follow_up_date'           // Phase B: Sort by upcoming reminders
  | 'last_contacted';          // Phase B: Sort by when last contacted

/**
 * Filter options for contacts
 * Phase B: Extended with CRM filters
 * Phase C: Extended with source and isManual filters
 */
export interface ContactFilters {
  search?: string;
  category?: ContactCategory;
  tags?: string[];
  isStarred?: boolean;
  hasReminder?: boolean;       // Has follow-up date set
  isArchived?: boolean;        // Show archived contacts
  source?: ContactSource;      // Phase C: Filter by source
  isManual?: boolean;          // Phase C: true = manual only, false = connected only
}

/**
 * Input for updating contact CRM data (Phase B)
 * Used by PUT /api/contacts/[contactId]
 */
export interface UpdateContactInput {
  notes?: string | null;
  tags?: string[] | null;
  category?: ContactCategory | null;
  priority?: ContactPriority | null;
  follow_up_date?: string | null;  // ISO date string
  follow_up_note?: string | null;
  last_contacted_at?: string | null; // ISO date string
  is_starred?: boolean;
  is_archived?: boolean;
  // Contact info fields (manual contacts)
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_company?: string | null;
  contact_address?: string | null;
  contact_social_links?: ContactSocialLinks | null;
}

/**
 * Input for creating a manual contact (Phase C)
 * Used by POST /api/contacts
 */
export interface CreateManualContactInput {
  name: string;                   // Required
  email?: string;                 // Optional
  phone?: string;                 // Optional
  company?: string;               // Optional
  address?: string;               // Optional
  social_links?: ContactSocialLinks; // Optional
  source: ContactSource;          // Required (not 'connection')
  source_details?: string;        // Optional
  notes?: string;                 // Optional
  tags?: string[];                // Optional
  category?: ContactCategory;     // Optional
  priority?: ContactPriority;     // Optional
  follow_up_date?: string;        // Optional (ISO date)
  follow_up_note?: string;        // Optional
}

// ==================== PHASE D: IMPORT/EXPORT TYPES ====================

/**
 * Parsed row from CSV import
 */
export interface ImportRowData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags?: string;  // Comma-separated in CSV
  category?: string;
  source_details?: string;
}

/**
 * Column mapping for CSV import
 */
export interface ColumnMapping {
  name: number | null;      // Required - column index for name
  email: number | null;
  phone: number | null;
  company: number | null;
  notes: number | null;
  tags: number | null;
  category: number | null;
}

/**
 * Import preview result
 */
export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  rows: ImportPreviewRow[];
}

/**
 * Single row in import preview
 */
export interface ImportPreviewRow {
  rowNumber: number;
  data: ImportRowData;
  status: 'valid' | 'invalid' | 'duplicate';
  errors: string[];
  existingContactId?: number;  // If duplicate
}

/**
 * Import result summary
 * Phase 5: Extended with match results for identifying Bizconekt members
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: ImportError[];
  /** Phase 5: Match results for imported contacts that match Bizconekt users */
  matchResults?: ImportMatchResults;
}

/**
 * Container for import match results
 * Phase 5: Contact-to-User Matching Integration
 */
export interface ImportMatchResults {
  /** Total number of matches found */
  totalMatched: number;
  /** High confidence matches (email/phone) */
  highConfidence: number;
  /** Medium confidence matches (name+company) */
  mediumConfidence: number;
  /** Individual match results */
  matches: ImportMatchResult[];
}

/**
 * Single match result for an imported contact
 * Phase 5: Contact-to-User Matching Integration
 */
export interface ImportMatchResult {
  /** ID of the imported contact */
  contactId: number;
  /** Name of the imported contact */
  contactName: string;
  /** ID of the matched Bizconekt user */
  matchedUserId: number;
  /** Basic info about the matched user */
  matchedUser: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    avatar_bg_color: string | null;
  };
  /** How the match was determined */
  matchType: 'email' | 'phone' | 'name_company';
  /** Confidence level of the match */
  confidence: 'high' | 'medium';
  /** Whether already connected to this user */
  isAlreadyConnected: boolean;
  /** Whether there's a pending connection request */
  hasPendingRequest: boolean;
}

/**
 * Import error detail
 */
export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'csv' | 'vcf';
  includeFields: ExportField[];
  filters?: ContactFilters;
  contactIds?: number[];  // Specific contacts to export
}

/**
 * Fields available for export
 */
export type ExportField =
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'notes'
  | 'tags'
  | 'category'
  | 'priority'
  | 'follow_up_date'
  | 'follow_up_note'
  | 'source'
  | 'source_details'
  | 'is_starred'
  | 'connected_since';

/**
 * vCard parsed contact
 */
export interface VCardContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  note?: string;
}

// ==================== PHASE E: ADVANCED FEATURES TYPES ====================

/**
 * Smart List criteria - Extended from ContactFilters
 * Used for creating dynamic auto-updating contact lists
 */
export interface SmartListCriteria extends ContactFilters {
  // Time-based criteria
  noInteractionDays?: number;          // No contact in X days
  connectionDateWithin?: number;        // Connected within X days
  reminderWithin?: number;              // Has reminder within X days
  reminderBefore?: string;              // Reminder before date (ISO string)

  // Value criteria
  priorityIn?: ContactPriority[];       // Any of these priorities
  categoriesIn?: ContactCategory[];     // Any of these categories
  sourcesIn?: ContactSource[];          // Any of these sources

  // Boolean combinations
  mustBeStarred?: boolean;
  mustHaveNotes?: boolean;
  mustHaveEmail?: boolean;
}

/**
 * Saved Smart List configuration
 */
export interface SmartList {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  criteria: SmartListCriteria;
  icon: string;                          // Lucide icon name
  color: string;                         // Tailwind color
  contact_count: number;                 // Cached count
  is_system: boolean;                    // Built-in vs user-created
  created_at: Date;
  updated_at: Date;
}

/**
 * Smart List input for creation
 */
export interface CreateSmartListInput {
  name: string;
  description?: string;
  criteria: SmartListCriteria;
  icon?: string;
  color?: string;
}

/**
 * Bulk action types
 */
export type BulkActionType =
  | 'add_tag'
  | 'remove_tag'
  | 'set_category'
  | 'set_priority'
  | 'star'
  | 'unstar'
  | 'archive'
  | 'unarchive'
  | 'delete'               // Manual contacts only
  | 'export'
  | 'refer';               // Refer each contact individually

/**
 * Bulk action input
 */
export interface BulkActionInput {
  action: BulkActionType;
  contactIds: number[];
  payload?: {
    tag?: string;
    category?: ContactCategory;
    priority?: ContactPriority;
  };
}

/**
 * Bulk action result
 */
export interface BulkActionResult {
  action: BulkActionType;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ contactId: number; error: string }>;
}

/**
 * Contact analytics data
 */
export interface ContactAnalytics {
  // Summary stats
  totalContacts: number;
  connectedContacts: number;
  manualContacts: number;
  starredContacts: number;
  archivedContacts: number;

  // Category distribution
  categoryDistribution: Array<{
    category: ContactCategory | 'uncategorized';
    count: number;
  }>;

  // Source distribution
  sourceDistribution: Array<{
    source: ContactSource;
    count: number;
  }>;

  // Priority distribution
  priorityDistribution: Array<{
    priority: ContactPriority | 'none';
    count: number;
  }>;

  // Growth over time (last 30 days)
  contactGrowth: Array<{
    date: string;
    newContacts: number;
    cumulativeTotal: number;
  }>;

  // Follow-up metrics
  upcomingReminders: number;
  overdueReminders: number;

  // Engagement metrics
  contactsWithNotes: number;
  contactsWithTags: number;
  averageTagsPerContact: number;

  // Top tags
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

/**
 * Date range for analytics
 */
export type AnalyticsDateRange = '7d' | '30d' | '90d' | '1y' | 'all';

// Phase 3: Referral System Types
export * from './referral';

// Phase 3.5: Unified Sharing & Recommendations Types
export * from './sharing';

// Phase 4: Reward & Gamification Types
export * from './reward';

// Phase 5: Contact Matching Types
export * from './matching';

// Phase 10: Analytics & Admin Dashboard Types
export * from './analytics';