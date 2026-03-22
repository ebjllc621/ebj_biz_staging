/**
 * FollowerBroadcastService - Listing Follower Notification Broadcast
 *
 * Coordinates listing-related notifications to followers (bookmarkers) and
 * category subscribers. Handles listing update notifications, new listing
 * in category broadcasts, and manual owner broadcasts to followers.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService-based error capture
 * - Build Map v2.1 ENHANCED patterns
 * - Promise.allSettled() for all fan-out dispatches
 *
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @reference src/core/services/notification/OfferNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';
import { getCategorySubscriptionService } from '@core/services/CategorySubscriptionService';

// ============================================================================
// Types
// ============================================================================

export interface BroadcastResult {
  success: boolean;
  recipientCount: number;
  error?: string;
}

export interface FollowerInfo {
  user_id: number;
  email: string;
  created_at: string;
}

export interface SubscriberInfo {
  user_id: number;
  email: string;
  notification_frequency: 'realtime' | 'daily' | 'weekly';
}

// ============================================================================
// FollowerBroadcastService
// ============================================================================

export class FollowerBroadcastService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // Broadcast Methods
  // ==========================================================================

  /**
   * Notify all listing followers when a listing is significantly updated
   * Followers are users who bookmarked the listing (user_bookmarks WHERE entity_type='listing')
   *
   * @param listingId Listing ID that was updated
   * @param updateType Description of the update type
   */
  async notifyListingUpdated(listingId: number, updateType: string): Promise<BroadcastResult> {
    try {
      // Get listing details
      const listingResult = await this.db.query<{
        id: number;
        business_name: string;
        slug: string;
      }>(
        'SELECT id, business_name, slug FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      // Get followers from user_bookmarks
      const followers = await this.getFollowers(listingId);

      if (followers.length === 0) {
        return { success: true, recipientCount: 0 };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
      const actionUrl = `${baseUrl}/listings/${listing.slug}`;

      // Dispatch to all followers
      const dispatchPromises = followers.map(follower =>
        this.notificationService.dispatch({
          type: 'listing.updated',
          recipientId: follower.user_id,
          title: `${listing.business_name} has been updated`,
          message: `${updateType} — check out what's new`,
          entityType: 'listing',
          entityId: listing.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            listing_id: listingId,
            update_type: updateType
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

      return { success: true, recipientCount: followers.length };

    } catch (error) {
      ErrorService.capture('[FollowerBroadcastService] notifyListingUpdated failed:', error);
      return {
        success: false,
        recipientCount: 0,
        error: error instanceof Error ? error.message : 'Broadcast failed'
      };
    }
  }

  /**
   * Notify category subscribers when a new listing is published in their subscribed category
   *
   * @param listingId New listing ID
   * @param categoryId Category the listing was published in
   */
  async notifyNewListingInCategory(listingId: number, categoryId: number): Promise<BroadcastResult> {
    try {
      // Get listing details
      const listingResult = await this.db.query<{
        id: number;
        business_name: string;
        slug: string;
      }>(
        'SELECT id, business_name, slug FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      // Get category name
      const categoryResult = await this.db.query<{ name: string }>(
        'SELECT name FROM categories WHERE id = ?',
        [categoryId]
      );

      const categoryName = categoryResult.rows[0]?.name ?? 'your category';

      // Get category subscribers
      const subscribers = await this.getCategorySubscribers(categoryId);

      if (subscribers.length === 0) {
        return { success: true, recipientCount: 0 };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
      const actionUrl = `${baseUrl}/listings/${listing.slug}`;

      // Dispatch to all subscribers
      const dispatchPromises = subscribers.map(subscriber =>
        this.notificationService.dispatch({
          type: 'listing.new_in_category',
          recipientId: subscriber.user_id,
          title: `New listing in ${categoryName}`,
          message: `${listing.business_name} just joined ${categoryName}`,
          entityType: 'listing',
          entityId: listing.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            listing_id: listingId,
            category_id: categoryId,
            category_name: categoryName
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

      return { success: true, recipientCount: subscribers.length };

    } catch (error) {
      ErrorService.capture('[FollowerBroadcastService] notifyNewListingInCategory failed:', error);
      return {
        success: false,
        recipientCount: 0,
        error: error instanceof Error ? error.message : 'Broadcast failed'
      };
    }
  }

  /**
   * Send a manual broadcast from a listing owner to all their followers
   *
   * @param listingId Listing ID
   * @param title Broadcast title
   * @param message Broadcast message
   * @param actionUrl URL for the broadcast action
   */
  async broadcastToFollowers(
    listingId: number,
    title: string,
    message: string,
    actionUrl: string
  ): Promise<BroadcastResult> {
    try {
      // Get listing details
      const listingResult = await this.db.query<{
        id: number;
        business_name: string;
      }>(
        'SELECT id, business_name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, recipientCount: 0, error: 'Listing not found' };
      }

      // Get followers from user_bookmarks
      const followers = await this.getFollowers(listingId);

      if (followers.length === 0) {
        return { success: true, recipientCount: 0 };
      }

      // Dispatch to all followers
      const dispatchPromises = followers.map(follower =>
        this.notificationService.dispatch({
          type: 'listing.owner_broadcast',
          recipientId: follower.user_id,
          title,
          message,
          entityType: 'listing',
          entityId: listing.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            listing_id: listingId,
            business_name: listing.business_name
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

      return { success: true, recipientCount: followers.length };

    } catch (error) {
      ErrorService.capture('[FollowerBroadcastService] broadcastToFollowers failed:', error);
      return {
        success: false,
        recipientCount: 0,
        error: error instanceof Error ? error.message : 'Broadcast failed'
      };
    }
  }

  // ==========================================================================
  // Follower Queries
  // ==========================================================================

  /**
   * Get all users who have bookmarked a listing
   * @param listingId Listing ID
   */
  async getFollowers(listingId: number): Promise<FollowerInfo[]> {
    try {
      const result = await this.db.query<FollowerInfo>(
        `SELECT ub.user_id, u.email, ub.created_at
         FROM user_bookmarks ub
         JOIN users u ON u.id = ub.user_id
         WHERE ub.entity_type = 'listing' AND ub.entity_id = ?`,
        [listingId]
      );

      return result.rows;
    } catch (error) {
      ErrorService.capture('[FollowerBroadcastService] getFollowers failed:', error);
      throw error;
    }
  }

  /**
   * Get all subscribers for a category — delegates to CategorySubscriptionService
   * @param categoryId Category ID
   */
  async getCategorySubscribers(categoryId: number): Promise<SubscriberInfo[]> {
    const categorySubscriptionService = getCategorySubscriptionService();
    return categorySubscriptionService.getSubscribersForCategory(categoryId);
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: FollowerBroadcastService | null = null;

export function getFollowerBroadcastService(): FollowerBroadcastService {
  if (!instance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNotificationService } = require('@core/services/ServiceRegistry');
    instance = new FollowerBroadcastService(getDatabaseService(), getNotificationService());
  }
  return instance;
}

export default FollowerBroadcastService;
