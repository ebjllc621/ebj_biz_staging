/**
 * HomePageService - Homepage Data Fetching Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  PublicHomeData,
  AuthenticatedHomeData,
  FeaturedCategory,
  ListingCardData,
  OfferCardData,
  EventCardData,
  PlatformStats,
  UserHomeStats,
  ActivityItem,
  ConnectionSuggestion,
  NetworkGrowth
} from '../types';

// ============================================================================
// HomePageService Implementation
// ============================================================================

export class HomePageService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // Public Homepage Data
  // ==========================================================================

  /**
   * Get all data needed for the public homepage
   * @param options.category - Optional category slug to filter offers/events by listing category
   * @returns PublicHomeData object with all sections
   */
  async getPublicHomeData(options: { category?: string } = {}): Promise<PublicHomeData> {
    const { category } = options;

    // If category filter provided, look up the category ID first
    let categoryId: number | null = null;
    if (category) {
      const catResult: DbResult<{ id: number }> = await this.db.query(
        'SELECT id FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1',
        [category]
      );
      if (catResult.rows.length > 0 && catResult.rows[0]) {
        categoryId = catResult.rows[0].id;
      }
    }

    const [
      categories,
      featured_listings,
      active_offers,
      upcoming_events,
      latest_listings,
      stats
    ] = await Promise.all([
      this.getFeaturedCategories(100),
      this.getFeaturedListings(8),
      this.getActiveOffers(6, categoryId),
      this.getUpcomingEvents(6, categoryId),
      this.getLatestListings(8),
      this.getPlatformStats()
    ]);

    return {
      categories,
      featured_listings,
      active_offers,
      upcoming_events,
      latest_listings,
      stats
    };
  }

  /**
   * Get featured categories with listing counts
   * @param limit Number of categories to return
   */
  async getFeaturedCategories(limit: number = 12): Promise<FeaturedCategory[]> {
    const result: DbResult<{
      id: number;
      name: string;
      slug: string;
      listing_count: bigint | number;
    }> = await this.db.query(
      `SELECT
        c.id,
        c.name,
        c.slug,
        COUNT(l.id) as listing_count
      FROM categories c
      LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'active'
      WHERE c.is_active = 1 AND c.parent_id IS NULL
        AND c.name NOT IN ('Writing Services', 'Sunglasses')
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.name ASC
      LIMIT ?`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      listing_count: bigIntToNumber(row.listing_count)
    }));
  }

  /**
   * Get featured listings for homepage
   * @param limit Number of listings to return
   */
  async getFeaturedListings(limit: number = 8): Promise<ListingCardData[]> {
    const result: DbResult<{
      id: number;
      name: string;
      slug: string;
      category_name: string | null;
      city: string | null;
      state: string | null;
      cover_image_url: string | null;
      logo_url: string | null;
      tier: 'essentials' | 'plus' | 'preferred' | 'premium';
      view_count: number;
      favorite_count: number;
      is_featured: number | boolean;
    }> = await this.db.query(
      `SELECT
        l.id,
        l.name,
        l.slug,
        c.name as category_name,
        l.city,
        l.state,
        l.cover_image_url,
        l.logo_url,
        l.tier,
        l.view_count,
        l.favorite_count,
        l.is_featured
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.status = 'active' AND l.approved = 'approved'
      ORDER BY l.is_featured DESC, l.tier DESC, l.view_count DESC, l.favorite_count DESC
      LIMIT ?`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category_name: row.category_name ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
      logo_url: row.logo_url ?? undefined,
      tier: row.tier,
      is_featured: Boolean(row.is_featured),
    }));
  }

  /**
   * Get latest listings for homepage
   * @param limit Number of listings to return
   */
  async getLatestListings(limit: number = 8): Promise<ListingCardData[]> {
    const result: DbResult<{
      id: number;
      name: string;
      slug: string;
      category_name: string | null;
      city: string | null;
      state: string | null;
      cover_image_url: string | null;
      logo_url: string | null;
      tier: 'essentials' | 'plus' | 'preferred' | 'premium';
    }> = await this.db.query(
      `SELECT
        l.id,
        l.name,
        l.slug,
        c.name as category_name,
        l.city,
        l.state,
        l.cover_image_url,
        l.logo_url,
        l.tier
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.status = 'active' AND l.approved = 'approved'
      ORDER BY l.created_at DESC
      LIMIT ?`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category_name: row.category_name ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
      logo_url: row.logo_url ?? undefined,
      tier: row.tier,
      is_featured: false
    }));
  }

  /**
   * Get active offers for homepage
   * @param limit Number of offers to return
   * @param categoryId Optional category ID to filter by listing category
   */
  async getActiveOffers(limit: number = 6, categoryId: number | null = null): Promise<OfferCardData[]> {
    // Build WHERE clauses
    const whereClauses = [
      'o.status = \'active\'',
      'o.end_date > NOW()',
      'o.start_date <= NOW()'
    ];
    const params: (number | string)[] = [];

    // Category filter: filter by listings in the specified category
    if (categoryId !== null) {
      whereClauses.push(`(
        JSON_CONTAINS(l.active_categories, CAST(? AS CHAR))
        OR (l.active_categories IS NULL AND l.category_id = ?)
      )`);
      params.push(String(categoryId), categoryId);
    }

    params.push(limit);

    const result: DbResult<{
      id: number;
      title: string;
      slug: string;
      listing_name: string;
      listing_slug: string;
      offer_type: 'discount' | 'coupon' | 'product' | 'service';
      original_price: number | null;
      sale_price: number | null;
      discount_percentage: number | null;
      image: string | null;
      end_date: Date;
    }> = await this.db.query(
      `SELECT
        o.id,
        o.title,
        o.slug,
        l.name as listing_name,
        l.slug as listing_slug,
        o.offer_type,
        o.original_price,
        o.sale_price,
        o.discount_percentage,
        o.image,
        o.end_date
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY o.is_featured DESC, o.created_at DESC
      LIMIT ?`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      listing_name: row.listing_name,
      listing_slug: row.listing_slug,
      offer_type: row.offer_type,
      original_price: row.original_price ?? undefined,
      sale_price: row.sale_price ?? undefined,
      discount_percentage: row.discount_percentage ?? undefined,
      image: row.image ?? undefined,
      end_date: new Date(row.end_date)
    }));
  }

  /**
   * Get upcoming events for homepage
   * @param limit Number of events to return
   * @param categoryId Optional category ID to filter by listing category
   */
  async getUpcomingEvents(limit: number = 6, categoryId: number | null = null): Promise<EventCardData[]> {
    // Build WHERE clauses
    const whereClauses = [
      'e.status = \'published\'',
      'e.start_date > NOW()'
    ];
    const params: (number | string)[] = [];

    // Category filter: filter by listings in the specified category
    if (categoryId !== null) {
      whereClauses.push(`(
        JSON_CONTAINS(l.active_categories, CAST(? AS CHAR))
        OR (l.active_categories IS NULL AND l.category_id = ?)
      )`);
      params.push(String(categoryId), categoryId);
    }

    params.push(limit);

    const result: DbResult<{
      id: number;
      title: string;
      slug: string;
      listing_name: string;
      listing_slug: string;
      event_type: string | null;
      start_date: Date;
      end_date: Date;
      venue_name: string | null;
      city: string | null;
      state: string | null;
      banner_image: string | null;
      is_ticketed: number;
      ticket_price: number | null;
      remaining_capacity: number | null;
    }> = await this.db.query(
      `SELECT
        e.id,
        e.title,
        e.slug,
        l.name as listing_name,
        l.slug as listing_slug,
        e.event_type,
        e.start_date,
        e.end_date,
        e.venue_name,
        e.city,
        e.state,
        e.banner_image,
        e.is_ticketed,
        e.ticket_price,
        e.remaining_capacity
      FROM events e
      JOIN listings l ON e.listing_id = l.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY e.is_featured DESC, e.start_date ASC
      LIMIT ?`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      listing_name: row.listing_name,
      listing_slug: row.listing_slug,
      event_type: row.event_type ?? undefined,
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      venue_name: row.venue_name ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      banner_image: row.banner_image ?? undefined,
      is_ticketed: Boolean(row.is_ticketed),
      ticket_price: row.ticket_price ?? undefined,
      remaining_capacity: row.remaining_capacity ?? undefined
    }));
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const result: DbResult<{
      total_listings: bigint | number;
      total_users: bigint | number;
      total_reviews: bigint | number;
      total_events: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM listings WHERE status = 'active') as total_listings,
        (SELECT COUNT(*) FROM users WHERE role != 'admin') as total_users,
        (SELECT COUNT(*) FROM reviews WHERE status = 'approved') as total_reviews,
        (SELECT COUNT(*) FROM events WHERE status = 'published' AND start_date > NOW()) as total_events`
    );

    const stats = result.rows[0];
    return {
      total_listings: bigIntToNumber(stats?.total_listings),
      total_users: bigIntToNumber(stats?.total_users),
      total_reviews: bigIntToNumber(stats?.total_reviews),
      total_events: bigIntToNumber(stats?.total_events)
    };
  }

  // ==========================================================================
  // Authenticated Homepage Data
  // ==========================================================================

  /**
   * Get all data needed for the authenticated homepage
   * @param userId User ID
   * @returns AuthenticatedHomeData object with all sections
   */
  async getAuthenticatedHomeData(userId: number): Promise<AuthenticatedHomeData> {
    const [
      user_stats,
      recent_activity,
      connection_suggestions,
      personalized_listings,
      personalized_offers,
      network_growth,
      // Browse sections (same as public homepage)
      categories,
      featured_listings,
      active_offers,
      upcoming_events
    ] = await Promise.all([
      this.getUserStats(userId),
      this.getRecentActivity(userId, 8),
      this.getConnectionSuggestions(userId, 6),
      this.getPersonalizedListings(userId, 6),
      this.getPersonalizedOffers(userId, 4),
      this.getNetworkGrowth(userId),
      // Fetch browse sections for authenticated users too
      this.getFeaturedCategories(100),
      this.getFeaturedListings(8),
      this.getActiveOffers(6),
      this.getUpcomingEvents(6)
    ]);

    return {
      user_stats,
      recent_activity,
      connection_suggestions,
      personalized_listings,
      personalized_offers,
      network_growth,
      // Include browse sections
      categories,
      featured_listings,
      active_offers,
      upcoming_events
    };
  }

  /**
   * Get user statistics for homepage
   * @param userId User ID
   */
  async getUserStats(userId: number): Promise<UserHomeStats> {
    const result: DbResult<{
      profile_views: bigint | number;
      connections: bigint | number;
      unread_messages: bigint | number;
      owned_listings: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM profile_view WHERE profile_owner_id = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as profile_views,
        (SELECT COUNT(*) FROM user_connection WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected') as connections,
        (SELECT COUNT(*) FROM user_message WHERE receiver_user_id = ? AND read_at IS NULL) as unread_messages,
        (SELECT COUNT(*) FROM listings WHERE user_id = ? AND status = 'active') as owned_listings`,
      [userId, userId, userId, userId, userId]
    );

    const stats = result.rows[0];
    return {
      profile_views: bigIntToNumber(stats?.profile_views),
      connections: bigIntToNumber(stats?.connections),
      unread_messages: bigIntToNumber(stats?.unread_messages),
      owned_listings: bigIntToNumber(stats?.owned_listings)
    };
  }

  /**
   * Get recent network activity for user
   * @param userId User ID
   * @param limit Number of activity items to return
   */
  async getRecentActivity(userId: number, limit: number = 8): Promise<ActivityItem[]> {
    const result: DbResult<{
      id: number;
      activity_type: string;
      title: string;
      description: string;
      actor_name: string | null;
      created_at: Date;
    }> = await this.db.query(
      `SELECT
        sa.id,
        sa.activity_type,
        COALESCE(sa.title, 'Activity') as title,
        COALESCE(sa.description, '') as description,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.username) as actor_name,
        sa.created_at
      FROM social_activity sa
      LEFT JOIN users u ON sa.creator_user_id = u.id
      WHERE sa.target_user_id = ? OR sa.creator_user_id IN (
        SELECT receiver_user_id FROM user_connection WHERE sender_user_id = ? AND status = 'connected'
        UNION
        SELECT sender_user_id FROM user_connection WHERE receiver_user_id = ? AND status = 'connected'
      )
      ORDER BY sa.created_at DESC
      LIMIT ?`,
      [userId, userId, userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      type: (row.activity_type as ActivityItem['type']) || 'listing',
      title: row.title,
      description: row.description,
      actor_name: row.actor_name ?? undefined,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Get connection suggestions for user
   * @param userId User ID
   * @param limit Number of suggestions to return
   */
  async getConnectionSuggestions(userId: number, limit: number = 6): Promise<ConnectionSuggestion[]> {
    // Get users who share similar categories or are in the same city
    const result: DbResult<{
      id: number;
      name: string;
      occupation: string | null;
      company: string | null;
      mutual_count: number;
    }> = await this.db.query(
      `SELECT
        u.id,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.username) as name,
        up.occupation,
        up.company,
        0 as mutual_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id != ?
        AND u.id NOT IN (
          SELECT receiver_user_id FROM user_connection WHERE sender_user_id = ?
          UNION
          SELECT sender_user_id FROM user_connection WHERE receiver_user_id = ?
        )
        AND u.role != 'admin'
      ORDER BY u.created_at DESC
      LIMIT ?`,
      [userId, userId, userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      occupation: row.occupation ?? undefined,
      company: row.company ?? undefined,
      mutual_connections: row.mutual_count
    }));
  }

  /**
   * Get personalized listings based on user activity
   * @param userId User ID
   * @param limit Number of listings to return
   */
  async getPersonalizedListings(userId: number, limit: number = 6): Promise<ListingCardData[]> {
    // For now, return featured listings that aren't owned by the user
    // TODO: Implement ML-based personalization based on user activity
    const result: DbResult<{
      id: number;
      name: string;
      slug: string;
      category_name: string | null;
      city: string | null;
      state: string | null;
      cover_image_url: string | null;
      logo_url: string | null;
      tier: 'essentials' | 'plus' | 'preferred' | 'premium';
    }> = await this.db.query(
      `SELECT
        l.id,
        l.name,
        l.slug,
        c.name as category_name,
        l.city,
        l.state,
        l.cover_image_url,
        l.logo_url,
        l.tier
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.status = 'active'
        AND l.approved = 'approved'
        AND l.user_id != ?
      ORDER BY l.tier DESC, l.view_count DESC
      LIMIT ?`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category_name: row.category_name ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
      logo_url: row.logo_url ?? undefined,
      tier: row.tier,
      is_featured: row.tier === 'premium' || row.tier === 'preferred'
    }));
  }

  /**
   * Get personalized offers based on user preferences
   * @param userId User ID
   * @param limit Number of offers to return
   */
  async getPersonalizedOffers(userId: number, limit: number = 4): Promise<OfferCardData[]> {
    // Return active offers, prioritizing those from connected businesses
    const result: DbResult<{
      id: number;
      title: string;
      slug: string;
      listing_name: string;
      listing_slug: string;
      offer_type: 'discount' | 'coupon' | 'product' | 'service';
      original_price: number | null;
      sale_price: number | null;
      discount_percentage: number | null;
      image: string | null;
      end_date: Date;
    }> = await this.db.query(
      `SELECT
        o.id,
        o.title,
        o.slug,
        l.name as listing_name,
        l.slug as listing_slug,
        o.offer_type,
        o.original_price,
        o.sale_price,
        o.discount_percentage,
        o.image,
        o.end_date
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      WHERE o.status = 'active'
        AND o.end_date > NOW()
        AND o.start_date <= NOW()
        AND l.user_id != ?
      ORDER BY o.is_featured DESC, o.discount_percentage DESC
      LIMIT ?`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      listing_name: row.listing_name,
      listing_slug: row.listing_slug,
      offer_type: row.offer_type,
      original_price: row.original_price ?? undefined,
      sale_price: row.sale_price ?? undefined,
      discount_percentage: row.discount_percentage ?? undefined,
      image: row.image ?? undefined,
      end_date: new Date(row.end_date)
    }));
  }

  /**
   * Get network growth metrics for user
   * @param userId User ID
   */
  async getNetworkGrowth(userId: number): Promise<NetworkGrowth> {
    const result: DbResult<{
      weekly_connections: bigint | number;
      weekly_views: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM user_connection
         WHERE (sender_user_id = ? OR receiver_user_id = ?)
         AND status = 'connected'
         AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as weekly_connections,
        (SELECT COUNT(*) FROM profile_view
         WHERE profile_owner_id = ?
         AND viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)) as weekly_views`,
      [userId, userId, userId]
    );

    const stats = result.rows[0];
    const weeklyConnections = bigIntToNumber(stats?.weekly_connections);
    const weeklyViews = bigIntToNumber(stats?.weekly_views);

    // Calculate engagement rate (views / connections ratio, capped at 100%)
    const engagementRate = weeklyConnections > 0
      ? Math.min(100, Math.round((weeklyViews / weeklyConnections) * 10))
      : 0;

    return {
      weekly_connections: weeklyConnections,
      weekly_views: weeklyViews,
      engagement_rate: engagementRate
    };
  }
}
