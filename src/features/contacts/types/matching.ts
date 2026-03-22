/**
 * Contact Matching Types
 * Phase 5 - Contact-to-User Matching (PYMK Integration)
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 */

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/**
 * Type of match found
 */
export type MatchType = 'email' | 'phone' | 'name_company' | 'none';

/**
 * Confidence level of the match
 */
export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Result of matching a contact to a Bizconekt user
 */
export interface ContactMatchResult {
  /** Whether a match was found */
  isMatched: boolean;
  /** The matched user's ID (if found) */
  matchedUserId: number | null;
  /** The matched user's details (if found) */
  matchedUser: MatchedUserInfo | null;
  /** Type of match that was found */
  matchType: MatchType;
  /** Confidence level of the match */
  confidence: MatchConfidence;
  /** Additional match metadata */
  metadata?: {
    /** Which field matched */
    matchedField: 'email' | 'phone' | 'name' | null;
    /** Normalized value that matched */
    matchedValue: string | null;
  };
}

/**
 * Basic info about a matched user
 */
export interface MatchedUserInfo {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg_color: string | null;
  occupation: string | null;
  city: string | null;
  /** Whether current user is already connected to this user */
  isAlreadyConnected: boolean;
  /** Whether there's a pending connection request */
  hasPendingRequest: boolean;
}

/**
 * Input for batch matching contacts
 */
export interface BatchMatchInput {
  contactIds: number[];
}

/**
 * Result of batch matching operation
 */
export interface BatchMatchResult {
  /** Total contacts processed */
  total: number;
  /** Number of matches found */
  matched: number;
  /** Map of contactId -> match result */
  results: Map<number, ContactMatchResult>;
}

/**
 * Contact with match status for UI display
 */
export interface ContactWithMatch {
  contactId: number;
  matchResult: ContactMatchResult;
}

/**
 * Match status for display badge
 */
export type MatchStatusDisplay =
  | 'member'       // High-confidence match (email/phone)
  | 'may_know'     // Medium-confidence match (name+company)
  | 'connected'    // Already connected
  | 'pending'      // Request pending
  | 'none';        // No match
