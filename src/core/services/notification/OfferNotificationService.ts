/**
 * OfferNotificationService - Offer-Specific Notification Dispatch
 *
 * Coordinates offer-related notifications with NotificationService.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 * @tier ADVANCED
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @reference src/core/services/notification/ClaimNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';
import type { OfferNotificationEventType } from '@features/offers/types';

// ============================================================================
// Types
// ============================================================================

export interface OfferNotificationResult {
  success: boolean;
  error?: string;
}

export interface ClaimedOfferSummary {
  offer_id: number;
  offer_title: string;
  promo_code: string;
  end_date: Date;
  listing_name: string;
}

export interface PerformanceMetrics {
  total_shares: number;
  total_clicks: number;
  click_through_rate: number;
  top_platform: string | null;
}

// ============================================================================
// OfferNotificationService
// ============================================================================

export class OfferNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // User Notifications
  // ==========================================================================

  /**
   * Notify followers about a new offer publication
   * @param offerId Offer ID
   * @param listingId Listing ID
   */
  async notifyOfferPublished(offerId: number, listingId: number): Promise<OfferNotificationResult> {
    try {
      // Get offer details
      const offerResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
        discount_percentage: number | null;
        listing_id: number;
      }>(
        'SELECT id, title, slug, discount_percentage, listing_id FROM offers WHERE id = ?',
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return { success: false, error: 'Offer not found' };
      }

      const offer = offerResult.rows[0];
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }

      // Get listing details
      const listingResult = await this.db.query<{
        name: string;
        category_id: number | null;
      }>(
        'SELECT name, category_id FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      // Get followers (business + category + all_offers)
      const followersResult = await this.db.query<{ user_id: number }>(
        `SELECT DISTINCT user_id FROM offer_follows
         WHERE (follow_type = 'business' AND target_id = ?)
            OR (follow_type = 'category' AND target_id = ?)
            OR (follow_type = 'all_offers')`,
        [listingId, listing.category_id]
      );

      if (followersResult.rows.length === 0) {
        return { success: true }; // No followers, but not an error
      }

      // Build notification
      const savingsText = offer.discount_percentage
        ? `${offer.discount_percentage}% OFF`
        : 'Special Offer';

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
      const actionUrl = `${baseUrl}/offers/${offer.slug}`;

      // Dispatch to all followers
      const dispatchPromises = followersResult.rows.map(row =>
        this.notificationService.dispatch({
          type: 'offer.published',
          recipientId: row.user_id,
          title: `New offer from ${listing.name}`,
          message: `${offer.title} - ${savingsText}`,
          entityType: 'offer',
          entityId: offer.id,
          actionUrl,
          priority: 'normal',
          metadata: {
            offer_id: offer.id,
            listing_id: listingId,
            discount: offer.discount_percentage
          }
        })
      );

      await Promise.allSettled(dispatchPromises);

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] notifyOfferPublished failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Send claim confirmation to user and alert to business owner
   * @param claimId Claim ID
   * @param offerId Offer ID
   * @param userId User ID
   */
  async notifyOfferClaimed(claimId: number, offerId: number, userId: number): Promise<OfferNotificationResult> {
    try {
      // Get claim details
      const claimResult = await this.db.query<{
        id: number;
        promo_code: string;
        offer_id: number;
        user_id: number;
      }>(
        'SELECT id, promo_code, offer_id, user_id FROM offer_claims WHERE id = ?',
        [claimId]
      );

      if (claimResult.rows.length === 0) {
        return { success: false, error: 'Claim not found' };
      }

      const claim = claimResult.rows[0];
      if (!claim) {
        return { success: false, error: 'Claim not found' };
      }

      // Get offer and listing details
      const offerResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
        listing_id: number;
        end_date: string;
        redemption_instructions: string | null;
      }>(
        `SELECT o.id, o.title, o.slug, o.listing_id, o.end_date, o.redemption_instructions
         FROM offers o
         WHERE o.id = ?`,
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return { success: false, error: 'Offer not found' };
      }

      const offer = offerResult.rows[0];
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }

      // Get listing details
      const listingResult = await this.db.query<{
        name: string;
        user_id: number | null;
      }>(
        'SELECT name, user_id FROM listings WHERE id = ?',
        [offer.listing_id]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // 1. Send confirmation to claiming user
      await this.notificationService.dispatch({
        type: 'offer.claimed',
        recipientId: userId,
        title: `You claimed ${offer.title}!`,
        message: `Your promo code: ${claim.promo_code}. ${offer.redemption_instructions || 'Present this code at checkout.'}`,
        entityType: 'offer',
        entityId: offer.id,
        actionUrl: `${baseUrl}/dashboard/my-offers`,
        priority: 'high',
        metadata: {
          claim_id: claimId,
          offer_id: offerId,
          promo_code: claim.promo_code,
          expires_at: offer.end_date
        }
      });

      // 2. Send alert to business owner (if claimed)
      if (listing.user_id) {
        await this.notificationService.dispatch({
          type: 'offer.claim_received',
          recipientId: listing.user_id,
          title: `New offer claim: ${offer.title}`,
          message: `A user claimed your offer`,
          entityType: 'offer',
          entityId: offer.id,
          actionUrl: `${baseUrl}/dashboard/offers`,
          priority: 'normal',
          metadata: {
            claim_id: claimId,
            offer_id: offerId,
            user_id: userId
          }
        });
      }

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] notifyOfferClaimed failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Notify user about expiring claimed offers
   * @param userId User ID
   * @param claims Array of expiring claims
   */
  async notifyOfferExpiringSoon(userId: number, claims: ClaimedOfferSummary[]): Promise<OfferNotificationResult> {
    try {
      if (claims.length === 0) {
        return { success: true };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      if (claims.length === 1) {
        const claim = claims[0];
        if (!claim) {
          return { success: false, error: 'Invalid claim data' };
        }

        await this.notificationService.dispatch({
          type: 'offer.expiring_soon',
          recipientId: userId,
          title: `Your offer expires soon: ${claim.offer_title}`,
          message: `Use code ${claim.promo_code} at ${claim.listing_name} before it expires!`,
          entityType: 'offer',
          entityId: claim.offer_id,
          actionUrl: `${baseUrl}/dashboard/my-offers`,
          priority: 'high',
          metadata: {
            offer_id: claim.offer_id,
            promo_code: claim.promo_code,
            expires_at: claim.end_date
          }
        });
      } else {
        // Multiple expiring offers
        await this.notificationService.dispatch({
          type: 'offer.expiring_soon',
          recipientId: userId,
          title: `${claims.length} offers expiring soon`,
          message: 'Check your claimed offers before they expire!',
          entityType: 'user',
          entityId: userId,
          actionUrl: `${baseUrl}/dashboard/my-offers`,
          priority: 'high',
          metadata: {
            expiring_count: claims.length
          }
        });
      }

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] notifyOfferExpiringSoon failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Send offer digest to user
   * @param userId User ID
   * @param frequency Daily or weekly
   */
  async sendOfferDigest(userId: number, frequency: 'daily' | 'weekly'): Promise<OfferNotificationResult> {
    try {
      // Get user's follows
      const followsResult = await this.db.query<{
        follow_type: 'business' | 'category' | 'all_offers';
        target_id: number | null;
      }>(
        'SELECT follow_type, target_id FROM offer_follows WHERE user_id = ? AND notification_frequency = ?',
        [userId, frequency]
      );

      if (followsResult.rows.length === 0) {
        return { success: true }; // No follows for this frequency
      }

      // Get new offers from followed sources (last 24h for daily, 7 days for weekly)
      const timeWindow = frequency === 'daily' ? 1 : 7;

      const offersResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
      }>(
        `SELECT DISTINCT o.id, o.title, o.slug
         FROM offers o
         WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
           AND o.status = 'active'
         ORDER BY o.created_at DESC
         LIMIT 10`,
        [timeWindow]
      );

      if (offersResult.rows.length === 0) {
        return { success: true }; // No new offers
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // Send digest notification
      await this.notificationService.dispatch({
        type: 'offer.digest',
        recipientId: userId,
        title: `Your ${frequency} offer digest: ${offersResult.rows.length} new deals`,
        message: 'Check out the latest offers from businesses you follow',
        entityType: 'user',
        entityId: userId,
        actionUrl: `${baseUrl}/offers`,
        priority: 'low',
        metadata: {
          frequency,
          offer_count: offersResult.rows.length
        }
      });

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] sendOfferDigest failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Digest failed' };
    }
  }

  /**
   * Notify both user and business owner when a redemption is completed
   * @param claimId Claim ID
   * @param offerId Offer ID
   * @param userId User who redeemed
   * @param method Redemption method used
   * @phase Phase 3 - TD-P3-001
   */
  async notifyRedemptionComplete(
    claimId: number,
    offerId: number,
    userId: number,
    method: 'qr_scan' | 'manual_entry' | 'in_app' | 'self_reported'
  ): Promise<OfferNotificationResult> {
    try {
      // Get offer and listing details
      const offerResult = await this.db.query<{
        id: number;
        title: string;
        slug: string;
        listing_id: number;
      }>(
        'SELECT id, title, slug, listing_id FROM offers WHERE id = ?',
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return { success: false, error: 'Offer not found' };
      }

      const offer = offerResult.rows[0];
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }

      // Get listing details
      const listingResult = await this.db.query<{
        name: string;
        user_id: number | null;
      }>(
        'SELECT name, user_id FROM listings WHERE id = ?',
        [offer.listing_id]
      );

      if (listingResult.rows.length === 0) {
        return { success: false, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0];
      if (!listing) {
        return { success: false, error: 'Listing not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // Build human-readable method name
      const methodNames: Record<string, string> = {
        qr_scan: 'QR code scan',
        manual_entry: 'manual code entry',
        in_app: 'in-app verification',
        self_reported: 'self-reported'
      };
      const methodLabel = methodNames[method] || method;

      // 1. Send confirmation to user who redeemed
      await this.notificationService.dispatch({
        type: 'offer.redeemed',
        recipientId: userId,
        title: `Offer redeemed: ${offer.title}`,
        message: `Your offer at ${listing.name} has been successfully redeemed via ${methodLabel}.`,
        entityType: 'offer',
        entityId: offerId,
        actionUrl: `${baseUrl}/dashboard/my-offers`,
        priority: 'normal',
        metadata: {
          claim_id: claimId,
          offer_id: offerId,
          redemption_method: method
        }
      });

      // 2. Notify business owner (if listing is claimed)
      if (listing.user_id) {
        await this.notificationService.dispatch({
          type: 'offer.redemption_complete',
          recipientId: listing.user_id,
          title: `Redemption completed: ${offer.title}`,
          message: `A customer redeemed their offer via ${methodLabel}`,
          entityType: 'offer',
          entityId: offerId,
          actionUrl: `${baseUrl}/dashboard/offers`,
          priority: 'normal',
          metadata: {
            claim_id: claimId,
            offer_id: offerId,
            user_id: userId,
            redemption_method: method
          }
        });
      }

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] notifyRedemptionComplete failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }

  /**
   * Send performance update to business owner
   * @param listingId Listing ID
   * @param offerId Offer ID
   * @param metrics Performance metrics
   */
  async notifyOfferPerformance(
    listingId: number,
    offerId: number,
    metrics: PerformanceMetrics
  ): Promise<OfferNotificationResult> {
    try {
      // Get listing owner
      const listingResult = await this.db.query<{
        user_id: number | null;
        name: string;
      }>(
        'SELECT user_id, name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0 || !listingResult.rows[0]?.user_id) {
        return { success: false, error: 'Listing owner not found' };
      }

      const listing = listingResult.rows[0];
      const ownerId = listing.user_id as number; // Already validated above

      // Get offer title
      const offerResult = await this.db.query<{ title: string; slug: string }>(
        'SELECT title, slug FROM offers WHERE id = ?',
        [offerId]
      );

      if (offerResult.rows.length === 0) {
        return { success: false, error: 'Offer not found' };
      }

      const offer = offerResult.rows[0];
      if (!offer) {
        return { success: false, error: 'Offer not found' };
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // Send performance notification
      await this.notificationService.dispatch({
        type: 'offer.performance',
        recipientId: ownerId,
        title: `Performance update: ${offer.title}`,
        message: `${metrics.total_shares} shares, ${metrics.total_clicks} clicks, ${metrics.click_through_rate.toFixed(1)}% CTR`,
        entityType: 'offer',
        entityId: offerId,
        actionUrl: `${baseUrl}/dashboard/offers`,
        priority: 'low',
        metadata: {
          ...metrics,
          offer_id: offerId,
          listing_id: listingId
        }
      });

      return { success: true };

    } catch (error) {
      ErrorService.capture('[OfferNotificationService] notifyOfferPerformance failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Notification failed' };
    }
  }
}

export default OfferNotificationService;
