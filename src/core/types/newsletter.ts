/**
 * Newsletter Types - Tier 2 Content Types Phase 1
 *
 * GOVERNANCE COMPLIANCE:
 * - Type-safe database row to application entity mapping
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary: row types in db-rows.ts, app types here
 *
 * @authority CLAUDE.md - Type system standards
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase 1
 */

// ============================================================================
// Enums
// ============================================================================

export enum NewsletterStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum SubscriberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced'
}

// ============================================================================
// Application-Level Interfaces (parsed types)
// ============================================================================

export interface Newsletter {
  id: number;
  listing_id: number;
  title: string;
  slug: string | null;
  issue_number: number | null;
  excerpt: string | null;
  web_content: string | null;
  email_html: string | null;
  featured_image: string | null;
  category_id: number | null;
  tags: string[];                    // Parsed from JSON
  reading_time: number | null;
  status: NewsletterStatus;
  is_featured: boolean;              // Parsed from TINYINT(1)
  subscriber_count_at_send: number;
  open_count: number;
  click_count: number;
  view_count: number;
  bookmark_count: number;
  share_count: number;
  scheduled_at: Date | null;
  sent_at: Date | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface NewsletterSubscriber {
  id: number;
  listing_id: number;
  user_id: number | null;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  confirmation_token: string | null;
  subscribed_at: Date | null;
  unsubscribed_at: Date | null;
  created_at: Date;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateNewsletterInput {
  listing_id: number;
  title: string;
  slug?: string;
  issue_number?: number;
  excerpt?: string;
  web_content?: string;
  email_html?: string;
  featured_image?: string;
  category_id?: number;
  tags?: string[];
  reading_time?: number;
  is_featured?: boolean;
  scheduled_at?: Date | null;
}

export interface UpdateNewsletterInput {
  title?: string;
  slug?: string;
  issue_number?: number;
  excerpt?: string;
  web_content?: string;
  email_html?: string;
  featured_image?: string;
  category_id?: number;
  tags?: string[];
  reading_time?: number;
  status?: NewsletterStatus;
  is_featured?: boolean;
  scheduled_at?: Date | null;
  sent_at?: Date | null;
  published_at?: Date | null;
  subscriber_count_at_send?: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface NewsletterFilters {
  listing_id?: number;
  status?: NewsletterStatus;
  is_featured?: boolean;
  category_id?: number;
  searchQuery?: string;
  followedListingIds?: number[];
}

export type NewsletterSortOption = 'recent' | 'popular' | 'alphabetical' | 'issue_number';

// ============================================================================
// Analytics Types (Phase N8)
// ============================================================================

export interface NewsletterAnalyticsSummary {
  totals: {
    opens: number;
    clicks: number;
    views: number;
    shares: number;
    bookmarks: number;
    subscriberCountAtSend: number;
    openRate: number;
    clickRate: number;
  };
  dailyTrend: Array<{
    date: string;
    opens: number;
    clicks: number;
    views: number;
  }>;
  topLinks: Array<{
    url: string;
    clicks: number;
  }>;
  deliveryStats: {
    sentAt: string | null;
    subscriberCountAtSend: number;
  };
}

export interface SubscriberGrowthData {
  daily: Array<{
    date: string;
    subscribed: number;
    unsubscribed: number;
    net: number;
  }>;
  totals: {
    active: number;
    pending: number;
    unsubscribed: number;
    bounced: number;
  };
}

export interface DeliveryStats {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  avgOpenRate: number;
  avgClickRate: number;
  newsletters: Array<{
    id: number;
    title: string;
    sentAt: string;
    subscriberCountAtSend: number;
    openCount: number;
    clickCount: number;
    openRate: number;
    clickRate: number;
  }>;
}

export interface NewsletterAnalyticsRow {
  id: number;
  newsletter_id: number;
  event_type: 'open' | 'click' | 'page_view' | 'share' | 'bookmark';
  user_id: number | null;
  subscriber_id: number | null;
  link_url: string | null;
  source: 'email' | 'web' | 'direct' | 'social';
  user_agent: string | null;
  ip_hash: string | null;
  created_at: Date;
}
