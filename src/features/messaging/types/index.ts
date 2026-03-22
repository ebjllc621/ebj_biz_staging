/**
 * Messaging System Types
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_1_CORE_INFRASTRUCTURE_BRAIN_PLAN.md
 */

/**
 * Input for sending a new message
 */
export interface SendMessageInput {
  sender_user_id: number;
  receiver_user_id: number;
  subject?: string;
  content: string;
  message_type?: 'text' | 'image' | 'file' | 'system';
  thread_id?: string;
  reply_to_id?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Message record with sender/receiver profile information
 */
export interface Message {
  id: number;
  sender_user_id: number;
  receiver_user_id: number;
  subject: string | null;
  content: string;
  message_type: string;
  attachments: unknown | null;
  metadata: Record<string, unknown> | null;
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  read_at: Date | null;
  thread_id: string | null;
  reply_to_id: number | null;
  created_at: Date;
  updated_at: Date;
  // Joined sender profile info
  sender_username?: string;
  sender_display_name?: string | null;
  sender_avatar_url?: string | null;
  // Joined receiver profile info
  receiver_username?: string;
  receiver_display_name?: string | null;
  receiver_avatar_url?: string | null;
}

/**
 * Message thread summary for inbox view
 */
export interface MessageThread {
  thread_id: string;
  other_user_id: number;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_content: string;
  last_message_at: Date;
  unread_count: number;
  total_messages: number;
  /** Group thread fields (present when is_group_thread is true) */
  is_group_thread?: boolean;
  group_id?: number;
  group_name?: string;
  group_color?: string;
}

/**
 * Update message input (mark as read, update status)
 */
export interface UpdateMessageInput {
  status?: 'delivered' | 'read' | 'deleted';
}

/**
 * Message statistics for a user
 */
export interface MessageStats {
  total_messages: number;
  unread_count: number;
  sent_count: number;
  received_count: number;
}

// =============================================================================
// MESSAGE REACTIONS
// =============================================================================

/** Standard emoji reactions available for messages */
export const STANDARD_REACTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'] as const;
export type StandardReaction = typeof STANDARD_REACTIONS[number];

/** A single reaction record */
export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
  created_at: Date;
  username?: string;
  display_name?: string | null;
}

/** Aggregated reaction count for display */
export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  users: { user_id: number; username: string }[];
}
