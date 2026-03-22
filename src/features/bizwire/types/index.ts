/**
 * BizWire Feature Types
 *
 * @authority docs/components/contactListing/phases/PHASE_2_PLAN.md
 * @tier STANDARD
 */

// ============================================================================
// Source Tracking
// ============================================================================

/** Pages where BizWire contact can be initiated */
export type BizWireSourcePage =
  | 'listing_detail'
  | 'job_detail'
  | 'event_detail'
  | 'offer_detail'
  | 'bundle_detail'
  | 'content_detail'
  | 'search_results'
  | 'listing_card';

// ============================================================================
// Message Types (aligned with ListingMessageService)
// ============================================================================

/** Message type options for the contact form */
export type BizWireMessageType = 'inquiry' | 'quote_request' | 'appointment' | 'feedback' | 'other';

/** Message status values */
export type BizWireStatus = 'new' | 'read' | 'replied' | 'archived';

// ============================================================================
// Send Payload (matches API route expected body)
// ============================================================================

/** Payload for sending a new BizWire message */
export interface BizWireSendPayload {
  subject: string;
  content: string;
  message_type?: BizWireMessageType;
  source_page: BizWireSourcePage;
  source_url?: string;
  source_entity_type?: string;
  source_entity_id?: number;
}

// ============================================================================
// API Response Types (for future phases)
// ============================================================================

/** Single message in a thread */
export interface BizWireMessage {
  id: number;
  listing_id: number;
  sender_user_id: number;
  subject: string | null;
  content: string;
  message_type: BizWireMessageType;
  is_read: boolean;
  read_at: string | null;
  reply_to_id: number | null;
  thread_id: string;
  status: BizWireStatus;
  source_page: BizWireSourcePage | null;
  created_at: string;
  updated_at: string;
  // Joined fields from service queries
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  sender_email?: string;
  sender_avatar_url?: string | null;
}

/** Thread summary (from getListingBizWireThreads / getUserBizWireThreads) */
export interface BizWireThread {
  thread_id: string;
  listing_id: number;
  listing_name: string;
  listing_slug: string;
  listing_logo: string | null;
  subject: string | null;
  last_message_content: string;
  last_message_sender_id: number;
  last_message_sender_name: string;
  last_message_date: string;
  message_count: number;
  unread_count: number;
  status: BizWireStatus;
  created_at: string;
  updated_at: string;
}

/** Analytics summary (from BizWireAnalyticsService.getListingAnalytics) */
export interface BizWireAnalyticsSummary {
  total_messages: number;
  unread_messages: number;
  total_threads: number;
  avg_response_time_hours: number;
  response_rate: number;
  source_breakdown: Array<{ source: string; count: number; percentage: number }>;
  volume_over_time: Array<{ date: string; count: number }>;
}

// ============================================================================
// Component Props
// ============================================================================

/** Minimal listing data needed by BizWire components */
export interface BizWireListing {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

/** Hook return type for useBizWireSend */
export interface UseBizWireSendReturn {
  sendMessage: (_listingId: number, _payload: BizWireSendPayload) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}
