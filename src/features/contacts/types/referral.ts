/**
 * Referral System Types
 * Phase 3 - Referral System Foundation
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Referral status lifecycle
 */
export type ReferralStatus =
  | 'pending'     // Created but not sent
  | 'sent'        // Sent to referred person
  | 'viewed'      // Referral link clicked
  | 'registered'  // Referred person signed up
  | 'connected';  // Referred person connected with referrer

/**
 * Reward status for referral
 */
export type RewardStatus =
  | 'pending'   // Reward not yet earned
  | 'earned'    // Reward earned, awaiting redemption
  | 'redeemed'; // Reward has been redeemed

/**
 * Points awarded for each referral status
 */
export const REFERRAL_POINTS = {
  sent: 5,        // Points for sending a referral
  registered: 25, // Points when referred user registers
  connected: 50   // Points when referred user connects with referrer
} as const;

// ============================================================================
// MAIN INTERFACES
// ============================================================================

/**
 * Referral record from database
 */
export interface Referral {
  id: number;
  referrer_user_id: number;
  contact_id: number | null;
  referred_email: string;
  referred_phone: string | null;
  referred_name: string | null;
  referral_code: string;
  referral_message: string | null;
  referral_link: string | null;
  status: ReferralStatus;
  reward_status: RewardStatus;
  reward_points: number;
  sent_at: Date | null;
  viewed_at: Date | null;
  registered_at: Date | null;
  registered_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Input for creating a new referral
 */
export interface CreateReferralInput {
  /** Email of person being referred (required) */
  referred_email: string;
  /** Phone of person being referred (optional) */
  referred_phone?: string;
  /** Name of person being referred (optional) */
  referred_name?: string;
  /** Custom message from referrer (optional) */
  referral_message?: string;
  /** Contact ID if referring existing contact (optional) */
  contact_id?: number;
}

/**
 * Input for updating referral status
 */
export interface UpdateReferralInput {
  /** New status */
  status?: ReferralStatus;
  /** Custom message update */
  referral_message?: string;
}

/**
 * Referral with referrer info (for display)
 */
export interface ReferralWithReferrer extends Referral {
  referrer_name: string;
  referrer_avatar_url: string | null;
}

/**
 * Referral statistics for a user
 */
export interface ReferralStats {
  total_sent: number;
  total_registered: number;
  total_connected: number;
  total_points_earned: number;
  pending_referrals: number;
  conversion_rate: number; // registered / sent * 100
}

/**
 * Referral filters for querying
 */
export interface ReferralFilters {
  status?: ReferralStatus;
  reward_status?: RewardStatus;
  from_date?: string; // ISO date
  to_date?: string;   // ISO date
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Referral template for customization
 */
export interface ReferralTemplate {
  subject: string;
  greeting: string;
  body: string;
  signature: string;
  includeLink: boolean;
}

/**
 * Default referral template
 */
export const DEFAULT_REFERRAL_TEMPLATE: ReferralTemplate = {
  subject: 'Join me on Bizconekt!',
  greeting: 'Hi {name},',
  body: "I've been using Bizconekt to grow my professional network and thought you'd love it too. It's a great platform for connecting with other professionals and discovering business opportunities.",
  signature: 'Looking forward to connecting with you there!',
  includeLink: true
};
