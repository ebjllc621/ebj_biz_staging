/**
 * Notification Event Types - Central type definitions
 *
 * @authority docs/notificationService/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Notification event type union - comprehensive list of all notification events
 */
export type NotificationEventType =
  // Messaging
  | 'message.received'
  | 'message.read'

  // Connections
  | 'connection.request_received'
  | 'connection.request_accepted'
  | 'connection.request_declined'

  // Reviews
  | 'review.received'
  | 'review.response'

  // Mentions
  | 'mention.in_review'
  | 'mention.in_message'

  // Events
  | 'event.rsvp_confirmed'
  | 'event.new_rsvp'
  | 'event.reminder'
  | 'event.cancelled'
  | 'event.updated'
  | 'event.new_published'
  | 'event.nearing_capacity'   // Owner notified when >80% capacity reached
  | 'event.full'               // Owner + saved-event users notified when capacity=0
  | 'event.filling_up'         // Saved-event users notified when <20% remaining
  | 'event.share_reminder'     // Phase 8: Nudge creator to share event
  | 'event.invitation'         // Phase 8: Direct attendee invitation

  // Subscriptions (Platform)
  | 'subscription.payment_failed'
  | 'subscription.renewing_soon'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.tier_changed'

  // Subscriptions (User-to-User)
  | 'subscription.new_subscriber'
  | 'subscription.subscriber_cancelled'
  | 'subscription.content_published'

  // System
  | 'system.announcement'
  | 'system.maintenance'
  | 'system.security_alert'

  // Claim Events
  | 'claim.initiated'
  | 'claim.verification_pending'
  | 'claim.under_review'
  | 'claim.approved'
  | 'claim.rejected'

  // Contacts (Phase 5.5)
  | 'contact.became_member'    // Contact in CRM joined Bizconekt

  // Recommendations (Phase 2, 4)
  | 'recommendation.received'
  | 'recommendation.viewed'
  | 'recommendation.helpful_marked'
  | 'recommendation.thanked'        // Phase 4: Thank you received

  // Referrals (Platform Invites)
  | 'referral.registered'           // Referred person signed up
  | 'referral.connected'            // Referred person connected with referrer

  // Offers (Phase 2)
  | 'offer.published'               // New offer from followed business/category
  | 'offer.claimed'                 // User claimed an offer (to user)
  | 'offer.claim_received'          // Business received a claim (to business)
  | 'offer.expiring_soon'           // Claimed offer expiring (to user)
  | 'offer.digest'                  // Periodic offer summary (to user)
  | 'offer.performance'             // Performance update (to business)

  // Offers (Phase 3 - TD-P3-001, TD-P3-008)
  | 'offer.redeemed'                // Offer redeemed confirmation (to user)
  | 'offer.redemption_complete'     // Redemption completed (to business owner)
  | 'offer.dispute_opened'          // Dispute opened on redemption (to business)

  // Connection Groups (Phase 2)
  | 'group.message_posted'          // Message posted to group
  | 'group.member_added'            // Member added to group
  | 'group.member_removed'          // Member removed from group
  | 'group.listing_recommended'     // Listing recommended to group
  | 'group.member_mentioned'        // Member mentioned in group message
  | 'group.member_suggested'        // Member suggested for group
  | 'group.suggestion_reviewed'     // Suggestion approved/denied
  | 'group.member_left'             // Member voluntarily left group

  // BizWire (Contact Listing Messaging)
  | 'bizwire.message_received'      // New contact message to listing
  | 'bizwire.reply_received'        // Reply in existing thread
  | 'bizwire.message_read'          // Sender notified when owner reads

  // Jobs (Phase 2)
  | 'job.application_received'
  | 'job.application_status_changed'
  | 'job.alert_match'
  | 'job.deadline_approaching'
  | 'job.published'
  | 'job.share_reminder'           // Phase 8: Nudge owner to share job posting

  // Listings (Phase 3A)
  | 'listing.updated'              // Listing significantly updated (to followers)
  | 'listing.new_in_category'      // New listing in subscribed category
  | 'listing.owner_broadcast'      // Manual broadcast from listing owner

  // Listings (Phase 3B)
  | 'listing.milestone_achieved'   // Milestone celebration
  | 'listing.review_prompt'        // Post-visit review prompt
  | 'listing.share_reminder'       // Share nudge for owners

  // Content Interactions (Phase 3)
  | 'content.comment_received'     // Comment on user's content → notify content author
  | 'content.report_filed'         // Content reported → notify admins
  | 'content.article_published'    // Article published → notify listing followers
  | 'content.podcast_published'    // Podcast published → notify listing followers
  | 'content.video_published'      // Video published → notify listing followers
  | 'content.newsletter_published' // Newsletter published → notify listing followers
  | 'content.guide_published'      // Guide published → notify listing followers
  | 'content.guide_updated'        // Guide updated by admin

  // Moderation Decisions (notify content creators of admin decisions)
  | 'review.approved'              // Review approved by admin → notify review author
  | 'review.rejected'              // Review rejected by admin → notify review author with reason
  | 'event.moderation_approved'    // Event approved by admin → notify event creator
  | 'event.moderation_rejected'    // Event rejected by admin → notify event creator with reason
  | 'content.moderation_approved'  // Content approved by admin → notify content creator
  | 'content.moderation_rejected'  // Content rejected by admin → notify content creator with reason

  // Creator Profile Contact Proposals (Phase 5)
  | 'content.contact_proposal_received'   // Profile owner receives a proposal
  | 'content.contact_proposal_responded'  // Sender notified of response (Phase 8)

  // Creator Profile Reviews (Phase 6)
  | 'content.review_received'             // Profile owner notified of new review (Phase 6)

  // Creator Profile Admin Actions (Phase 7)
  | 'content.review_approved'       // Admin approved profile review → notify reviewer
  | 'content.review_rejected'       // Admin rejected profile review → notify reviewer
  | 'content.profile_verified'      // Admin verified profile → notify profile owner
  | 'content.profile_suspended'    // Admin suspended profile → notify profile owner

  // Social Media Posting (Tier 5A Phase 3)
  | 'social.post_published'       // Post successfully published to platform
  | 'social.post_failed'          // Post failed (API error, token expired)
  | 'social.scheduled_post_published'  // Scheduled post published by cron (Tier 5A Phase 7)
  | 'social.connection_expiring'  // Token expiring within 7 days (Tier 5A Phase 8)
  | 'social.connection_expired'   // Token has expired (Tier 5A Phase 8)

  // Content Subscription Follow Events (Tier 4 Phase 6)
  | 'content.followed'           // User followed content creator/type
  | 'content.unfollowed'         // User unfollowed
  | 'subscription.digest_sent'   // Digest email sent to subscriber

  // Billing - Payments (Phase 7)
  | 'billing.payment_successful'
  | 'billing.payment_retry_scheduled'
  | 'billing.payment_method_expiring'
  | 'billing.payment_method_updated'

  // Billing - Plan Changes (Phase 7)
  | 'billing.plan_upgraded'
  | 'billing.plan_downgraded'
  | 'billing.plan_created'

  // Billing - Renewals (Phase 7)
  | 'billing.renewal_reminder_7days'
  | 'billing.renewal_reminder_3days'
  | 'billing.renewal_reminder_1day'

  // Billing - Dunning (Phase 7)
  | 'billing.dunning_attempt_1'
  | 'billing.dunning_attempt_2'
  | 'billing.dunning_final_warning'

  // Billing - Refunds (Phase 7)
  | 'billing.refund_requested'
  | 'billing.refund_approved'
  | 'billing.refund_processed'
  | 'billing.refund_denied'

  // Billing - Statements (Phase 7)
  | 'billing.statement_available'

  // Billing - Campaign Bank (Phase 7)
  | 'billing.campaign_bank_low'
  | 'billing.campaign_bank_depleted';

/**
 * Notification channels
 */
export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

/**
 * Entity types that can be associated with notifications
 */
export type NotificationEntityType = 'listing' | 'event' | 'offer' | 'user' | 'review' | 'subscription' | 'job' | 'content';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Notification event - input to NotificationService.dispatch()
 */
export interface NotificationEvent {
  /** Event type (e.g., 'message.received', 'connection.request_received') */
  type: NotificationEventType;

  /** User ID to receive the notification */
  recipientId: number;

  /** Notification title (displayed in UI) */
  title: string;

  /** Optional notification message/body */
  message?: string;

  /** Optional entity type for linking */
  entityType?: NotificationEntityType;

  /** Optional entity ID for linking */
  entityId?: number;

  /** Optional URL for notification action */
  actionUrl?: string;

  /** Priority level (affects delivery channels) */
  priority: NotificationPriority;

  /** Optional: Override default channel selection */
  channels?: NotificationChannel[];

  /** Optional additional metadata */
  metadata?: Record<string, unknown>;

  /** User ID who triggered this event (e.g., message sender) */
  triggeredBy?: number;
}

/**
 * Result of notification dispatch
 */
export interface DispatchResult {
  /** Whether dispatch was successful */
  dispatched: boolean;

  /** Reason if not dispatched (e.g., 'user_preference') */
  reason?: string;

  /** Created notification ID (if dispatched) */
  notificationId?: number;

  /** Channels the notification was sent to */
  channels?: NotificationChannel[];

  /** Total dispatch latency in milliseconds (Phase 4) */
  latencyMs?: number;
}

// ============================================================================
// Legacy Type Mapping (for migration)
// ============================================================================

/**
 * Maps event types to legacy notification_type values
 * Used for backward compatibility with existing `user_notifications` table
 */
export const EVENT_TO_LEGACY_TYPE: Record<NotificationEventType, string> = {
  // Messaging
  'message.received': 'message',
  'message.read': 'message',

  // Connections
  'connection.request_received': 'connection_request',
  'connection.request_accepted': 'connection_request',
  'connection.request_declined': 'connection_request',

  // Reviews
  'review.received': 'review',
  'review.response': 'review',

  // Mentions
  'mention.in_review': 'mention',
  'mention.in_message': 'mention',

  // Events
  'event.rsvp_confirmed': 'system',
  'event.new_rsvp': 'system',
  'event.reminder': 'system',
  'event.cancelled': 'system',
  'event.updated': 'system',
  'event.new_published': 'system',
  'event.nearing_capacity': 'system',
  'event.full': 'system',
  'event.filling_up': 'system',
  'event.share_reminder': 'system',
  'event.invitation': 'system',

  // Subscriptions (Platform)
  'subscription.payment_failed': 'system',
  'subscription.renewing_soon': 'system',
  'subscription.renewed': 'system',
  'subscription.cancelled': 'system',
  'subscription.tier_changed': 'system',

  // Subscriptions (User-to-User)
  'subscription.new_subscriber': 'system',
  'subscription.subscriber_cancelled': 'system',
  'subscription.content_published': 'system',

  // System
  'system.announcement': 'system',
  'system.maintenance': 'system',
  'system.security_alert': 'system',

  // Claim Events
  'claim.initiated': 'system',
  'claim.verification_pending': 'system',
  'claim.under_review': 'system',
  'claim.approved': 'system',
  'claim.rejected': 'system',

  // Contacts (Phase 5.5)
  'contact.became_member': 'contact',

  // Recommendations
  'recommendation.received': 'recommendation',
  'recommendation.viewed': 'recommendation',
  'recommendation.helpful_marked': 'recommendation',
  'recommendation.thanked': 'recommendation',  // Phase 4

  // Referrals (Platform Invites)
  'referral.registered': 'referral',
  'referral.connected': 'referral',

  // Offers (Phase 2)
  'offer.published': 'system',
  'offer.claimed': 'system',
  'offer.claim_received': 'system',
  'offer.expiring_soon': 'system',
  'offer.digest': 'system',
  'offer.performance': 'system',

  // Offers (Phase 3)
  'offer.redeemed': 'system',
  'offer.redemption_complete': 'system',
  'offer.dispute_opened': 'system',

  // Connection Groups (Phase 2)
  'group.message_posted': 'messages',
  'group.member_added': 'connections',
  'group.member_removed': 'connections',
  'group.listing_recommended': 'recommendations',
  'group.member_mentioned': 'messages',
  'group.member_suggested': 'connections',
  'group.suggestion_reviewed': 'connections',
  'group.member_left': 'connections',

  // BizWire
  'bizwire.message_received': 'bizwire',
  'bizwire.reply_received': 'bizwire',
  'bizwire.message_read': 'bizwire',

  // Jobs (Phase 2)
  'job.application_received': 'system',
  'job.application_status_changed': 'system',
  'job.alert_match': 'system',
  'job.deadline_approaching': 'system',
  'job.published': 'system',
  'job.share_reminder': 'system',

  // Listings (Phase 3A)
  'listing.updated': 'system',
  'listing.new_in_category': 'system',
  'listing.owner_broadcast': 'system',

  // Listings (Phase 3B)
  'listing.milestone_achieved': 'system',
  'listing.review_prompt': 'system',
  'listing.share_reminder': 'system',

  // Content Interactions (Phase 3)
  'content.comment_received': 'content',
  'content.report_filed': 'system',
  'content.article_published': 'content',
  'content.podcast_published': 'content',
  'content.video_published': 'content',
  'content.newsletter_published': 'content',
  'content.guide_published': 'content',
  'content.guide_updated': 'content',

  // Moderation Decisions
  'review.approved': 'review',
  'review.rejected': 'review',
  'event.moderation_approved': 'system',
  'event.moderation_rejected': 'system',
  'content.moderation_approved': 'system',
  'content.moderation_rejected': 'system',

  // Creator Profile Contact Proposals (Phase 5)
  'content.contact_proposal_received': 'content',
  'content.contact_proposal_responded': 'content',

  // Creator Profile Reviews (Phase 6)
  'content.review_received': 'review',

  // Creator Profile Admin Actions (Phase 7)
  'content.review_approved': 'review_update',
  'content.review_rejected': 'review_update',
  'content.profile_verified': 'profile_update',
  'content.profile_suspended': 'profile_update',

  // Social Media Posting (Tier 5A Phase 3)
  'social.post_published': 'system',
  'social.post_failed': 'system',
  'social.scheduled_post_published': 'system',
  'social.connection_expiring': 'system',
  'social.connection_expired': 'system',

  // Content Subscription Follow Events (Tier 4 Phase 6)
  'content.followed': 'content',
  'content.unfollowed': 'content',
  'subscription.digest_sent': 'system',

  // Billing - Payments (Phase 7)
  'billing.payment_successful': 'system',
  'billing.payment_retry_scheduled': 'system',
  'billing.payment_method_expiring': 'system',
  'billing.payment_method_updated': 'system',

  // Billing - Plan Changes (Phase 7)
  'billing.plan_upgraded': 'system',
  'billing.plan_downgraded': 'system',
  'billing.plan_created': 'system',

  // Billing - Renewals (Phase 7)
  'billing.renewal_reminder_7days': 'system',
  'billing.renewal_reminder_3days': 'system',
  'billing.renewal_reminder_1day': 'system',

  // Billing - Dunning (Phase 7)
  'billing.dunning_attempt_1': 'system',
  'billing.dunning_attempt_2': 'system',
  'billing.dunning_final_warning': 'system',

  // Billing - Refunds (Phase 7)
  'billing.refund_requested': 'system',
  'billing.refund_approved': 'system',
  'billing.refund_processed': 'system',
  'billing.refund_denied': 'system',

  // Billing - Statements (Phase 7)
  'billing.statement_available': 'system',

  // Billing - Campaign Bank (Phase 7)
  'billing.campaign_bank_low': 'system',
  'billing.campaign_bank_depleted': 'system',
};

// ============================================================================
// User Notification Preferences (Phase 2)
// ============================================================================

/**
 * Notification category identifiers
 */
export type NotificationCategory =
  | 'messages'
  | 'bizwire'
  | 'connections'
  | 'reviews'
  | 'events'
  | 'subscriptions'
  | 'system'
  | 'recommendations'
  | 'referrals'
  | 'offers'
  | 'jobs'
  | 'content';

/**
 * Email delivery mode
 */
export type EmailDeliveryMode = 'immediate' | 'digest' | 'never';

/**
 * Per-category notification preferences
 */
export interface CategoryPreference {
  /** Whether this category is enabled at all */
  enabled: boolean;
  /** In-app notifications (always true if enabled) */
  inApp: boolean;
  /** Push notifications */
  push: boolean;
  /** Email delivery mode */
  email: EmailDeliveryMode;
}

/**
 * Complete user notification preferences structure
 */
export interface UserNotificationPreferences {
  // Global settings
  /** Master notification toggle */
  globalEnabled: boolean;
  /** Quiet hours enabled */
  quietHoursEnabled: boolean;
  /** Quiet hours start time (HH:mm format) */
  quietHoursStart: string;
  /** Quiet hours end time (HH:mm format) */
  quietHoursEnd: string;
  /** User's timezone for quiet hours */
  timezone: string;

  // Per-category settings
  categories: {
    messages: CategoryPreference;
    bizwire: CategoryPreference;
    connections: CategoryPreference;
    reviews: CategoryPreference;
    events: CategoryPreference;
    subscriptions: CategoryPreference;
    system: CategoryPreference;
    recommendations: CategoryPreference;
    referrals: CategoryPreference;
    offers: CategoryPreference;
    jobs: CategoryPreference;
    content: CategoryPreference;
  };

  // Digest settings
  /** Enable digest emails */
  digestEnabled: boolean;
  /** Digest frequency */
  digestFrequency: 'daily' | 'weekly';
  /** Preferred digest time (HH:mm format) */
  digestTime: string;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  globalEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'America/New_York',

  categories: {
    messages: { enabled: true, inApp: true, push: true, email: 'never' },
    bizwire: { enabled: true, inApp: true, push: true, email: 'immediate' },
    connections: { enabled: true, inApp: true, push: true, email: 'digest' },
    reviews: { enabled: true, inApp: true, push: true, email: 'digest' },
    events: { enabled: true, inApp: true, push: true, email: 'immediate' },
    subscriptions: { enabled: true, inApp: true, push: true, email: 'immediate' },
    system: { enabled: true, inApp: true, push: true, email: 'immediate' },
    recommendations: { enabled: true, inApp: true, push: true, email: 'digest' },
    referrals: { enabled: true, inApp: true, push: true, email: 'immediate' },
    offers: { enabled: true, inApp: true, push: true, email: 'digest' },
    jobs: { enabled: true, inApp: true, push: true, email: 'digest' },
    content: { enabled: true, inApp: true, push: true, email: 'digest' },
  },

  digestEnabled: true,
  digestFrequency: 'daily',
  digestTime: '09:00',
};

/**
 * Maps event types to their notification category
 */
export const EVENT_TYPE_TO_CATEGORY: Record<NotificationEventType, NotificationCategory> = {
  // Messaging
  'message.received': 'messages',
  'message.read': 'messages',

  // Connections
  'connection.request_received': 'connections',
  'connection.request_accepted': 'connections',
  'connection.request_declined': 'connections',

  // Reviews
  'review.received': 'reviews',
  'review.response': 'reviews',

  // Mentions (grouped with messages)
  'mention.in_review': 'messages',
  'mention.in_message': 'messages',

  // Events
  'event.rsvp_confirmed': 'events',
  'event.new_rsvp': 'events',
  'event.reminder': 'events',
  'event.cancelled': 'events',
  'event.updated': 'events',
  'event.new_published': 'events',
  'event.nearing_capacity': 'events',
  'event.full': 'events',
  'event.filling_up': 'events',
  'event.share_reminder': 'events',
  'event.invitation': 'events',

  // Subscriptions (Platform)
  'subscription.payment_failed': 'subscriptions',
  'subscription.renewing_soon': 'subscriptions',
  'subscription.renewed': 'subscriptions',
  'subscription.cancelled': 'subscriptions',
  'subscription.tier_changed': 'subscriptions',

  // Subscriptions (User-to-User)
  'subscription.new_subscriber': 'subscriptions',
  'subscription.subscriber_cancelled': 'subscriptions',
  'subscription.content_published': 'subscriptions',

  // System
  'system.announcement': 'system',
  'system.maintenance': 'system',
  'system.security_alert': 'system',

  // Claim Events
  'claim.initiated': 'system',
  'claim.verification_pending': 'system',
  'claim.under_review': 'system',
  'claim.approved': 'system',
  'claim.rejected': 'system',

  // Contacts (Phase 5.5)
  'contact.became_member': 'connections',

  // Recommendations
  'recommendation.received': 'recommendations',
  'recommendation.viewed': 'recommendations',
  'recommendation.helpful_marked': 'recommendations',
  'recommendation.thanked': 'recommendations',  // Phase 4

  // Referrals (Platform Invites)
  'referral.registered': 'referrals',
  'referral.connected': 'referrals',

  // Offers (Phase 2)
  'offer.published': 'offers',
  'offer.claimed': 'offers',
  'offer.claim_received': 'offers',
  'offer.expiring_soon': 'offers',
  'offer.digest': 'offers',
  'offer.performance': 'offers',

  // Offers (Phase 3)
  'offer.redeemed': 'offers',
  'offer.redemption_complete': 'offers',
  'offer.dispute_opened': 'offers',

  // Connection Groups (Phase 2)
  'group.message_posted': 'messages',
  'group.member_added': 'connections',
  'group.member_removed': 'connections',
  'group.listing_recommended': 'recommendations',
  'group.member_mentioned': 'messages',
  'group.member_suggested': 'connections',
  'group.suggestion_reviewed': 'connections',
  'group.member_left': 'connections',

  // BizWire
  'bizwire.message_received': 'bizwire',
  'bizwire.reply_received': 'bizwire',
  'bizwire.message_read': 'bizwire',

  // Jobs (Phase 2)
  'job.application_received': 'jobs',
  'job.application_status_changed': 'jobs',
  'job.alert_match': 'jobs',
  'job.deadline_approaching': 'jobs',
  'job.published': 'jobs',
  'job.share_reminder': 'jobs',

  // Listings (Phase 3A)
  'listing.updated': 'system',
  'listing.new_in_category': 'system',
  'listing.owner_broadcast': 'system',

  // Listings (Phase 3B)
  'listing.milestone_achieved': 'system',
  'listing.review_prompt': 'system',
  'listing.share_reminder': 'system',

  // Content Interactions (Phase 3)
  'content.comment_received': 'content',
  'content.report_filed': 'system',
  'content.article_published': 'content',
  'content.podcast_published': 'content',
  'content.video_published': 'content',
  'content.newsletter_published': 'content',
  'content.guide_published': 'content',
  'content.guide_updated': 'content',

  // Moderation Decisions
  'review.approved': 'reviews',
  'review.rejected': 'reviews',
  'event.moderation_approved': 'events',
  'event.moderation_rejected': 'events',
  'content.moderation_approved': 'content',
  'content.moderation_rejected': 'content',

  // Creator Profile Contact Proposals (Phase 5)
  'content.contact_proposal_received': 'content',
  'content.contact_proposal_responded': 'content',

  // Creator Profile Reviews (Phase 6)
  'content.review_received': 'reviews',

  // Creator Profile Admin Actions (Phase 7)
  'content.review_approved': 'reviews',
  'content.review_rejected': 'reviews',
  'content.profile_verified': 'content',
  'content.profile_suspended': 'content',

  // Social Media Posting (Tier 5A Phase 3)
  'social.post_published': 'system',
  'social.post_failed': 'system',
  'social.scheduled_post_published': 'system',
  'social.connection_expiring': 'system',
  'social.connection_expired': 'system',

  // Content Subscription Follow Events (Tier 4 Phase 6)
  'content.followed': 'content',
  'content.unfollowed': 'content',
  'subscription.digest_sent': 'subscriptions',

  // Billing - Payments (Phase 7)
  'billing.payment_successful': 'system',
  'billing.payment_retry_scheduled': 'system',
  'billing.payment_method_expiring': 'system',
  'billing.payment_method_updated': 'system',

  // Billing - Plan Changes (Phase 7)
  'billing.plan_upgraded': 'system',
  'billing.plan_downgraded': 'system',
  'billing.plan_created': 'system',

  // Billing - Renewals (Phase 7)
  'billing.renewal_reminder_7days': 'system',
  'billing.renewal_reminder_3days': 'system',
  'billing.renewal_reminder_1day': 'system',

  // Billing - Dunning (Phase 7)
  'billing.dunning_attempt_1': 'system',
  'billing.dunning_attempt_2': 'system',
  'billing.dunning_final_warning': 'system',

  // Billing - Refunds (Phase 7)
  'billing.refund_requested': 'system',
  'billing.refund_approved': 'system',
  'billing.refund_processed': 'system',
  'billing.refund_denied': 'system',

  // Billing - Statements (Phase 7)
  'billing.statement_available': 'system',

  // Billing - Campaign Bank (Phase 7)
  'billing.campaign_bank_low': 'system',
  'billing.campaign_bank_depleted': 'system',
};
