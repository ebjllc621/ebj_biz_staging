/**
 * Content Contact Proposal Types
 *
 * Type definitions for the content_contact_proposals table and related inputs.
 *
 * @authority Tier3_Phases/PHASE_5_CONTACT_PROPOSAL_SYSTEM.md
 * @phase Tier 3 Creator Profiles - Phase 5
 */

// ============================================================================
// Enum Types
// ============================================================================

export type ProfileContactType = 'affiliate_marketer' | 'internet_personality' | 'podcaster';
export type ProposalType = 'hire' | 'collaborate' | 'inquiry' | 'sponsor' | 'guest_booking';
export type ProposalStatus = 'pending' | 'read' | 'replied' | 'archived' | 'declined';

// ============================================================================
// App-Level Interface
// ============================================================================

export interface ContentContactProposal {
  id: number;
  profile_type: ProfileContactType;
  profile_id: number;
  profile_owner_user_id: number;
  sender_user_id: number;
  sender_name: string;
  sender_email: string;
  proposal_type: ProposalType;
  subject: string;
  message: string;
  budget_range: string | null;
  timeline: string | null;
  company_name: string | null;
  status: ProposalStatus;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateContactProposalInput {
  subject: string;
  message: string;
  proposal_type: ProposalType;
  budget_range?: string;
  timeline?: string;
  company_name?: string;
}
