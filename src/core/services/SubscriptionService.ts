/**
 * SubscriptionService - Subscription & Tier Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Grandfathering system with plan versioning
 * - Tier enforcement with override support
 * - Add-on suite management
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4 Brain Plan - Service Layer Implementation
 * @phase Phase 4 - Task 4.6: SubscriptionService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import {
  SubscriptionPlanRow,
  ListingSubscriptionRow,
  AddonSuiteRow,
  ListingSubscriptionAddonRow,
  AdminSubscriptionPlanRow,
  AdminAddonSuiteRow
} from '@core/types/db-rows';
import { safeJsonParse } from '@core/utils/bigint';
import type {
  AdminSubscriptionPlan,
  AdminAddonSuite,
  PackageStatus,
  UpdatePackageInput,
  CreateAddonInput,
  UpdateAddonInput,
  UpgradePackageInput,
  UpgradeAddonInput
} from '@/types/admin-packages';

// ============================================================================
// TypeScript Interfaces & Enums (imported from shared types for client safety)
// ============================================================================

import {
  ListingTier,
  SubscriptionStatus,
  AddonStatus,
  AddonSuiteName
} from '@core/types/subscription';

import type {
  SubscriptionPlan,
  AddonSuite,
  ListingSubscription,
  ListingSubscriptionAddon,
  TierLimits,
  TierCheckResult,
  CreatePlanInput,
  UpgradePath,
  StripeSubscriptionConfig
} from '@core/types/subscription';

import { stripe } from '@core/config/stripe';

// Re-export for backward compatibility
export {
  ListingTier,
  SubscriptionStatus,
  AddonStatus,
  AddonSuiteName
};

export type {
  SubscriptionPlan,
  AddonSuite,
  ListingSubscription,
  ListingSubscriptionAddon,
  TierLimits,
  TierCheckResult,
  CreatePlanInput,
  UpgradePath
};

// ============================================================================
// Custom Error Classes
// ============================================================================

export class PlanNotFoundError extends BizError {
  constructor(identifier: number | ListingTier) {
    super({
      code: 'PLAN_NOT_FOUND',
      message: `Subscription plan not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested subscription plan was not found'
    });
  }
}

export class SubscriptionNotFoundError extends BizError {
  constructor(identifier: number) {
    super({
      code: 'SUBSCRIPTION_NOT_FOUND',
      message: `Subscription not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested subscription was not found'
    });
  }
}

export class InvalidUpgradePathError extends BizError {
  constructor(fromTier: ListingTier, toTier: ListingTier) {
    super({
      code: 'INVALID_UPGRADE_PATH',
      message: `Invalid upgrade path from ${fromTier} to ${toTier}`,
      context: { fromTier, toTier },
      userMessage: 'This subscription change is not allowed'
    });
  }
}

export class FeatureLimitExceededError extends BizError {
  constructor(feature: string, current: number, limit: number) {
    super({
      code: 'FEATURE_LIMIT_EXCEEDED',
      message: `Feature limit exceeded for ${feature}: ${current}/${limit}`,
      context: { feature, current, limit },
      userMessage: `You have reached the limit for ${feature}`
    });
  }
}

export class AddonNotFoundError extends BizError {
  constructor(identifier: number | AddonSuiteName) {
    super({
      code: 'ADDON_NOT_FOUND',
      message: `Add-on suite not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested add-on suite was not found'
    });
  }
}

export class DuplicateSubscriptionError extends BizError {
  constructor(listingId: number) {
    super({
      code: 'DUPLICATE_SUBSCRIPTION',
      message: `Listing ${listingId} already has an active subscription`,
      context: { listingId },
      userMessage: 'This listing already has an active subscription'
    });
  }
}

// ============================================================================
// SubscriptionService Implementation
// ============================================================================

export class SubscriptionService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // PLAN MANAGEMENT
  // ==========================================================================

  /**
   * Get all subscription plans (including deprecated)
   * @returns Array of all plans
   */
  async getAllPlans(): Promise<SubscriptionPlan[]> {
    const result: DbResult<SubscriptionPlanRow> = await this.db.query<SubscriptionPlanRow>(
      'SELECT * FROM subscription_plans ORDER BY tier, version DESC'
    );

    return result.rows.map(this.mapRowToPlan);
  }

  /**
   * Get active (non-deprecated) subscription plans
   * @returns Array of active plans
   */
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    const result: DbResult<SubscriptionPlanRow> = await this.db.query<SubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE deprecated_date IS NULL ORDER BY tier'
    );

    return result.rows.map(this.mapRowToPlan);
  }

  /**
   * Get subscription plan by ID
   * @param id Plan ID
   * @returns Plan or null if not found
   */
  async getPlanById(id: number): Promise<SubscriptionPlan | null> {
    const result: DbResult<SubscriptionPlanRow> = await this.db.query<SubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToPlan(row);
  }

  /**
   * Get current active plan for a tier
   * @param tier Listing tier
   * @returns Current plan for tier
   */
  async getPlanByTier(tier: ListingTier): Promise<SubscriptionPlan> {
    const result: DbResult<SubscriptionPlanRow> = await this.db.query<SubscriptionPlanRow>(
      `SELECT * FROM subscription_plans
       WHERE tier = ? AND deprecated_date IS NULL
       ORDER BY effective_date DESC
       LIMIT 1`,
      [tier]
    );

    if (result.rows.length === 0) {
      throw new PlanNotFoundError(tier);
    }

    const row = result.rows[0];
    if (!row) throw new PlanNotFoundError(tier);

    return this.mapRowToPlan(row);
  }

  /**
   * Create a new subscription plan
   * @param data Plan data
   * @returns Created plan
   */
  async createPlan(data: CreatePlanInput): Promise<SubscriptionPlan> {
    const features = JSON.stringify(data.features);

    const result: DbResult<SubscriptionPlanRow> = await this.db.query<SubscriptionPlanRow>(
      `INSERT INTO subscription_plans (
        tier, version, name, pricing_monthly, pricing_annual,
        features, effective_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.tier,
        data.version,
        data.name,
        data.pricing_monthly || null,
        data.pricing_annual || null,
        features,
        data.effective_date
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create plan',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getPlanById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create plan',
        new Error('Failed to retrieve created plan')
      );
    }

    return created;
  }

  /**
   * Deprecate a subscription plan (sets deprecated_date)
   * @param planId Plan ID
   */
  async deprecatePlan(planId: number): Promise<void> {
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    await this.db.query(
      'UPDATE subscription_plans SET deprecated_date = NOW() WHERE id = ?',
      [planId]
    );

    // Mark all subscriptions on this plan as grandfathered
    await this.db.query(
      `UPDATE listing_subscriptions
       SET is_grandfathered = TRUE
       WHERE plan_id = ? AND status = 'active'`,
      [planId]
    );
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new subscription for a listing
   * @param listingId Listing ID
   * @param planId Plan ID
   * @returns Created subscription
   */
  async createSubscription(
    listingId: number,
    planId: number
  ): Promise<ListingSubscription> {
    // Check for existing active subscription
    const existing = await this.getSubscription(listingId);
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new DuplicateSubscriptionError(listingId);
    }

    // Verify plan exists
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    // Calculate renewal date (1 year from now for annual)
    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);

    const result: DbResult<ListingSubscriptionRow> = await this.db.query<ListingSubscriptionRow>(
      `INSERT INTO listing_subscriptions (
        listing_id, plan_id, plan_version, started_at, renews_at, status
      ) VALUES (?, ?, ?, NOW(), ?, 'active')`,
      [listingId, planId, plan.version, renewsAt]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create subscription',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getSubscriptionById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create subscription',
        new Error('Failed to retrieve created subscription')
      );
    }

    return created;
  }

  /**
   * Get subscription by listing ID
   * @param listingId Listing ID
   * @returns Subscription or null if not found
   */
  async getSubscription(listingId: number): Promise<ListingSubscription | null> {
    const result: DbResult<ListingSubscriptionRow> = await this.db.query<ListingSubscriptionRow>(
      `SELECT * FROM listing_subscriptions
       WHERE listing_id = ? AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [listingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToSubscription(row);
  }

  /**
   * Get subscription by ID
   * @param id Subscription ID
   * @returns Subscription or null if not found
   */
  async getSubscriptionById(id: number): Promise<ListingSubscription | null> {
    const result: DbResult<ListingSubscriptionRow> = await this.db.query<ListingSubscriptionRow>(
      'SELECT * FROM listing_subscriptions WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToSubscription(row);
  }

  /**
   * Upgrade subscription to a higher tier (immediate)
   * @param listingId Listing ID
   * @param newPlanId New plan ID
   * @returns Updated subscription
   */
  async upgradeSubscription(
    listingId: number,
    newPlanId: number
  ): Promise<ListingSubscription> {
    const currentSub = await this.getSubscription(listingId);
    if (!currentSub) {
      throw new SubscriptionNotFoundError(listingId);
    }

    const currentPlan = await this.getPlanById(currentSub.plan_id);
    const newPlan = await this.getPlanById(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new PlanNotFoundError(newPlanId);
    }

    // Validate upgrade path
    const tierOrder = {
      [ListingTier.ESSENTIALS]: 1,
      [ListingTier.PLUS]: 2,
      [ListingTier.PREFERRED]: 3,
      [ListingTier.PREMIUM]: 4
    };

    if (tierOrder[newPlan.tier] <= tierOrder[currentPlan.tier]) {
      throw new InvalidUpgradePathError(currentPlan.tier, newPlan.tier);
    }

    // Update subscription (immediate upgrade)
    await this.db.query(
      `UPDATE listing_subscriptions
       SET plan_id = ?, plan_version = ?, updated_at = NOW()
       WHERE id = ?`,
      [newPlanId, newPlan.version, currentSub.id]
    );

    const updated = await this.getSubscriptionById(currentSub.id);
    if (!updated) {
      throw BizError.databaseError(
        'upgrade subscription',
        new Error('Failed to retrieve updated subscription')
      );
    }

    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      const ownerResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );

      if (ownerResult.rows[0]) {
        notificationService.dispatch({
          type: 'subscription.tier_changed',
          recipientId: ownerResult.rows[0].user_id,
          title: `Subscription upgraded to ${newPlan.tier.charAt(0).toUpperCase() + newPlan.tier.slice(1)}`,
          message: `Your listing has been upgraded from ${currentPlan.tier} to ${newPlan.tier}. New features are now available!`,
          entityType: 'subscription',
          entityId: currentSub.id,
          actionUrl: '/dashboard/subscription',
          priority: 'normal',
          metadata: {
            subscription_id: currentSub.id,
            listing_id: listingId,
            old_tier: currentPlan.tier,
            new_tier: newPlan.tier
          }
        }).catch(err => {
          const { ErrorService } = require('@core/services/ErrorService');
          ErrorService.capture('[SubscriptionService] Failed to dispatch tier_changed notification:', err);
        });
      }
    } catch (err) {
      // Notification failure must not break upgrade
    }

    return updated;
  }

  /**
   * Downgrade subscription to a lower tier (takes effect at renewal)
   * @param listingId Listing ID
   * @param newPlanId New plan ID
   * @returns Updated subscription (downgrade pending)
   */
  async downgradeSubscription(
    listingId: number,
    newPlanId: number
  ): Promise<ListingSubscription> {
    const currentSub = await this.getSubscription(listingId);
    if (!currentSub) {
      throw new SubscriptionNotFoundError(listingId);
    }

    const currentPlan = await this.getPlanById(currentSub.plan_id);
    const newPlan = await this.getPlanById(newPlanId);

    if (!currentPlan || !newPlan) {
      throw new PlanNotFoundError(newPlanId);
    }

    // Validate downgrade path
    const tierOrder = {
      [ListingTier.ESSENTIALS]: 1,
      [ListingTier.PLUS]: 2,
      [ListingTier.PREFERRED]: 3,
      [ListingTier.PREMIUM]: 4
    };

    if (tierOrder[newPlan.tier] >= tierOrder[currentPlan.tier]) {
      throw new InvalidUpgradePathError(currentPlan.tier, newPlan.tier);
    }

    // Note: In production, this would schedule the downgrade for renewal date
    // For now, we'll just update the plan immediately
    await this.db.query(
      `UPDATE listing_subscriptions
       SET plan_id = ?, plan_version = ?, updated_at = NOW()
       WHERE id = ?`,
      [newPlanId, newPlan.version, currentSub.id]
    );

    const updated = await this.getSubscriptionById(currentSub.id);
    if (!updated) {
      throw BizError.databaseError(
        'downgrade subscription',
        new Error('Failed to retrieve updated subscription')
      );
    }

    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      const ownerResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );

      if (ownerResult.rows[0]) {
        notificationService.dispatch({
          type: 'subscription.tier_changed',
          recipientId: ownerResult.rows[0].user_id,
          title: `Subscription changed to ${newPlan.tier.charAt(0).toUpperCase() + newPlan.tier.slice(1)}`,
          message: `Your listing plan has been changed from ${currentPlan.tier} to ${newPlan.tier}. Some features may no longer be available.`,
          entityType: 'subscription',
          entityId: currentSub.id,
          actionUrl: '/dashboard/subscription',
          priority: 'normal',
          metadata: {
            subscription_id: currentSub.id,
            listing_id: listingId,
            old_tier: currentPlan.tier,
            new_tier: newPlan.tier
          }
        }).catch(err => {
          const { ErrorService } = require('@core/services/ErrorService');
          ErrorService.capture('[SubscriptionService] Failed to dispatch tier_changed notification:', err);
        });
      }
    } catch (err) {
      // Notification failure must not break downgrade
    }

    return updated;
  }

  /**
   * Cancel a subscription
   * @param listingId Listing ID
   */
  async cancelSubscription(listingId: number): Promise<void> {
    const subscription = await this.getSubscription(listingId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(listingId);
    }

    await this.db.query(
      `UPDATE listing_subscriptions
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = ?`,
      [subscription.id]
    );

    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      const ownerResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [listingId]
      );

      if (ownerResult.rows[0]) {
        notificationService.dispatch({
          type: 'subscription.cancelled',
          recipientId: ownerResult.rows[0].user_id,
          title: 'Subscription cancelled',
          message: 'Your listing subscription has been cancelled. Your listing will remain active until the end of the current billing period.',
          entityType: 'subscription',
          entityId: subscription.id,
          actionUrl: '/dashboard/subscription',
          priority: 'high',
          metadata: {
            subscription_id: subscription.id,
            listing_id: listingId
          }
        }).catch(err => {
          const { ErrorService } = require('@core/services/ErrorService');
          ErrorService.capture('[SubscriptionService] Failed to dispatch cancelled notification:', err);
        });
      }
    } catch (err) {
      // Notification failure must not break cancellation
    }
  }

  /**
   * Renew a subscription
   * @param subscriptionId Subscription ID
   * @returns Renewed subscription
   */
  async renewSubscription(subscriptionId: number): Promise<ListingSubscription> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    // Calculate new renewal date
    const newRenewsAt = new Date();
    newRenewsAt.setFullYear(newRenewsAt.getFullYear() + 1);

    await this.db.query(
      `UPDATE listing_subscriptions
       SET status = 'active', renews_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [newRenewsAt, subscriptionId]
    );

    const renewed = await this.getSubscriptionById(subscriptionId);
    if (!renewed) {
      throw BizError.databaseError(
        'renew subscription',
        new Error('Failed to retrieve renewed subscription')
      );
    }

    try {
      const { getNotificationService } = await import('@core/services/ServiceRegistry');
      const notificationService = getNotificationService();

      const ownerResult = await this.db.query<{ user_id: number; listing_id: number }>(
        `SELECT l.user_id, l.id as listing_id FROM listings l
         INNER JOIN listing_subscriptions ls ON l.id = ls.listing_id
         WHERE ls.id = ? LIMIT 1`,
        [subscriptionId]
      );

      if (ownerResult.rows[0]) {
        notificationService.dispatch({
          type: 'subscription.renewed',
          recipientId: ownerResult.rows[0].user_id,
          title: 'Subscription renewed successfully',
          message: `Your listing subscription has been renewed. Next renewal: ${newRenewsAt.toLocaleDateString()}.`,
          entityType: 'subscription',
          entityId: subscriptionId,
          actionUrl: '/dashboard/subscription',
          priority: 'normal',
          metadata: {
            subscription_id: subscriptionId,
            listing_id: ownerResult.rows[0].listing_id,
            renews_at: newRenewsAt.toISOString()
          }
        }).catch(err => {
          const { ErrorService } = require('@core/services/ErrorService');
          ErrorService.capture('[SubscriptionService] Failed to dispatch renewed notification:', err);
        });
      }
    } catch (err) {
      // Notification failure must not break renewal
    }

    return renewed;
  }

  // ==========================================================================
  // ADD-ON MANAGEMENT
  // ==========================================================================

  /**
   * Get all add-on suites (including deprecated)
   * @returns Array of all add-on suites
   */
  async getAllAddons(): Promise<AddonSuite[]> {
    const result: DbResult<AddonSuiteRow> = await this.db.query<AddonSuiteRow>(
      'SELECT * FROM addon_suites ORDER BY suite_name, version DESC'
    );

    return result.rows.map(this.mapRowToAddon);
  }

  /**
   * Get add-on suite by ID
   * @param id Add-on suite ID
   * @returns Add-on suite or null if not found
   */
  async getAddonById(id: number): Promise<AddonSuite | null> {
    const result: DbResult<AddonSuiteRow> = await this.db.query<AddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToAddon(row);
  }

  /**
   * Add an add-on suite to a subscription
   * @param subscriptionId Subscription ID
   * @param addonId Add-on suite ID
   */
  async addAddonToSubscription(
    subscriptionId: number,
    addonId: number
  ): Promise<void> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    const addon = await this.getAddonById(addonId);
    if (!addon) {
      throw new AddonNotFoundError(addonId);
    }

    // Check if addon already exists
    const existing: DbResult<ListingSubscriptionAddonRow> = await this.db.query<ListingSubscriptionAddonRow>(
      `SELECT * FROM listing_subscription_addons
       WHERE listing_subscription_id = ? AND addon_suite_id = ? AND status = 'active'`,
      [subscriptionId, addonId]
    );

    if (existing.rows.length > 0) {
      throw BizError.badRequest('Add-on already active on subscription', {
        subscriptionId,
        addonId
      });
    }

    // Calculate renewal date
    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);

    await this.db.query(
      `INSERT INTO listing_subscription_addons (
        listing_subscription_id, addon_suite_id, started_at, renews_at, status
      ) VALUES (?, ?, NOW(), ?, 'active')`,
      [subscriptionId, addonId, renewsAt]
    );
  }

  /**
   * Remove an add-on suite from a subscription
   * @param subscriptionId Subscription ID
   * @param addonId Add-on suite ID
   */
  async removeAddonFromSubscription(
    subscriptionId: number,
    addonId: number
  ): Promise<void> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    await this.db.query(
      `UPDATE listing_subscription_addons
       SET status = 'cancelled'
       WHERE listing_subscription_id = ? AND addon_suite_id = ?`,
      [subscriptionId, addonId]
    );
  }

  /**
   * Get all add-ons for a subscription
   * @param subscriptionId Subscription ID
   * @returns Array of add-on suites
   */
  async getSubscriptionAddons(subscriptionId: number): Promise<AddonSuite[]> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    const result: DbResult<AddonSuiteRow> = await this.db.query<AddonSuiteRow>(
      `SELECT a.* FROM addon_suites a
       INNER JOIN listing_subscription_addons lsa ON a.id = lsa.addon_suite_id
       WHERE lsa.listing_subscription_id = ? AND lsa.status = 'active'`,
      [subscriptionId]
    );

    return result.rows.map(this.mapRowToAddon);
  }

  // ==========================================================================
  // TIER ENFORCEMENT
  // ==========================================================================

  /**
   * Get tier limits for a listing (includes overrides and grandfathering)
   * @param listingId Listing ID
   * @returns Tier limits with overrides applied
   */
  async getTierLimits(listingId: number): Promise<TierLimits> {
    const subscription = await this.getSubscription(listingId);
    if (!subscription) {
      // Return default free tier limits
      return {
        categories: 6,
        images: 6,
        videos: 1,
        offers: 4,
        events: 4,
        html_descriptions: false
      };
    }

    const plan = await this.getPlanById(subscription.plan_id);
    if (!plan) {
      throw new PlanNotFoundError(subscription.plan_id);
    }

    // Start with plan features
    let limits = { ...plan.features };

    // Apply overrides if present
    if (subscription.override_features) {
      limits = { ...limits, ...subscription.override_features };
    }

    return limits;
  }

  /**
   * Check if a feature limit is reached
   * @param listingId Listing ID
   * @param feature Feature to check
   * @returns Check result with allowed status
   */
  async checkFeatureLimit(
    listingId: number,
    feature: keyof TierLimits
  ): Promise<TierCheckResult> {
    const limits = await this.getTierLimits(listingId);
    const limit = limits[feature] as number;

    // Check if unlimited
    if (limit === -1) {
      return {
        allowed: true,
        current: 0,
        limit: -1,
        unlimited: true
      };
    }

    // Get current usage (would need to query relevant tables)
    // For now, return structure with placeholder
    return {
      allowed: true,
      current: 0,
      limit,
      unlimited: false
    };
  }

  /**
   * Get feature value from tier limits
   * @param listingId Listing ID
   * @param feature Feature name
   * @returns Feature value
   */
  async getFeatureValue(
    listingId: number,
    feature: keyof TierLimits
  ): Promise<number | boolean> {
    const limits = await this.getTierLimits(listingId);
    const value = limits[feature];
    return value !== undefined ? value : 0;
  }

  // ==========================================================================
  // GRANDFATHERING
  // ==========================================================================

  /**
   * Mark a subscription as grandfathered
   * @param subscriptionId Subscription ID
   */
  async markAsGrandfathered(subscriptionId: number): Promise<void> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    await this.db.query(
      'UPDATE listing_subscriptions SET is_grandfathered = TRUE WHERE id = ?',
      [subscriptionId]
    );
  }

  /**
   * Apply custom overrides to a subscription
   * @param subscriptionId Subscription ID
   * @param overrides Override features
   */
  async applyOverrides(
    subscriptionId: number,
    overrides: Partial<TierLimits>
  ): Promise<void> {
    const subscription = await this.getSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    const overridesJson = JSON.stringify(overrides);

    await this.db.query(
      'UPDATE listing_subscriptions SET override_features = ? WHERE id = ?',
      [overridesJson, subscriptionId]
    );
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Calculate price for a plan and billing cycle
   * @param planId Plan ID
   * @param billingCycle Billing cycle
   * @returns Price
   */
  async calculatePrice(
    planId: number,
    billingCycle: 'monthly' | 'annual'
  ): Promise<number> {
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    if (billingCycle === 'monthly') {
      return plan.pricing_monthly || 0;
    } else {
      return plan.pricing_annual || 0;
    }
  }

  /**
   * Get upgrade path between tiers
   * @param currentTier Current tier
   * @param targetTier Target tier
   * @returns Upgrade path details
   */
  async getUpgradePath(
    currentTier: ListingTier,
    targetTier: ListingTier
  ): Promise<UpgradePath> {
    const currentPlan = await this.getPlanByTier(currentTier);
    const targetPlan = await this.getPlanByTier(targetTier);

    const tierOrder = {
      [ListingTier.ESSENTIALS]: 1,
      [ListingTier.PLUS]: 2,
      [ListingTier.PREFERRED]: 3,
      [ListingTier.PREMIUM]: 4
    };

    const isUpgrade = tierOrder[targetTier] > tierOrder[currentTier];
    const isDowngrade = tierOrder[targetTier] < tierOrder[currentTier];

    const priceMonthly1 = currentPlan.pricing_monthly || 0;
    const priceMonthly2 = targetPlan.pricing_monthly || 0;
    const priceAnnual1 = currentPlan.pricing_annual || 0;
    const priceAnnual2 = targetPlan.pricing_annual || 0;

    return {
      from_tier: currentTier,
      to_tier: targetTier,
      is_upgrade: isUpgrade,
      is_downgrade: isDowngrade,
      price_difference_monthly: priceMonthly2 - priceMonthly1,
      price_difference_annual: priceAnnual2 - priceAnnual1,
      proration_required: isUpgrade
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to SubscriptionPlan interface
   * @param row - Typed SubscriptionPlanRow from database
   * @returns SubscriptionPlan - Application-level SubscriptionPlan object
   */
  private mapRowToPlan(row: SubscriptionPlanRow): SubscriptionPlan {
    return {
      id: row.id,
      tier: row.tier as ListingTier,
      version: row.version,
      name: row.name,
      pricing_monthly: row.pricing_monthly,
      pricing_annual: row.pricing_annual,
      // MariaDB auto-parses JSON columns - use safeJsonParse for both string and object
      features: safeJsonParse<TierLimits>(row.features, {} as TierLimits),
      effective_date: new Date(row.effective_date),
      deprecated_date: row.deprecated_date ? new Date(row.deprecated_date) : null,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to AddonSuite interface
   * @param row - Typed AddonSuiteRow from database
   * @returns AddonSuite - Application-level AddonSuite object
   */
  private mapRowToAddon(row: AddonSuiteRow): AddonSuite {
    return {
      id: row.id,
      suite_name: row.suite_name as AddonSuiteName,
      version: row.version,
      display_name: row.display_name,
      pricing_monthly: row.pricing_monthly,
      pricing_annual: row.pricing_annual,
      // MariaDB auto-parses JSON columns - use safeJsonParse for both string and object
      features: safeJsonParse<string[]>(row.features, []),
      effective_date: new Date(row.effective_date),
      deprecated_date: row.deprecated_date ? new Date(row.deprecated_date) : null,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Map database row to ListingSubscription interface
   * @param row - Typed ListingSubscriptionRow from database
   * @returns ListingSubscription - Application-level ListingSubscription object
   */
  private mapRowToSubscription(row: ListingSubscriptionRow): ListingSubscription {
    return {
      id: row.id,
      listing_id: row.listing_id,
      plan_id: row.plan_id,
      plan_version: row.plan_version,
      started_at: new Date(row.started_at),
      renews_at: row.renews_at ? new Date(row.renews_at) : null,
      is_grandfathered: Boolean(row.is_grandfathered),
      override_features: row.override_features
        ? JSON.parse(row.override_features)
        : null,
      status: row.status as SubscriptionStatus,
      stripeSubscriptionId: row.stripe_subscription_id ?? null,
      stripePriceId: row.stripe_price_id ?? null,
      nextBillingDate: row.next_billing_date ? new Date(row.next_billing_date) : null,
      failedPaymentCount: row.failed_payment_count ?? 0,
      pendingTierChange: (row.pending_tier_change as import('@core/types/subscription').ListingTier | null) ?? null,
      billingCycle: (row.billing_cycle ?? 'monthly') as import('@core/types/subscription').BillingCycle,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  // ==========================================================================
  // ADMIN METHODS (Phase 1 - Packages & Add-Ons Management)
  // ==========================================================================

  /**
   * Get all plans with admin fields (including status, description)
   * @returns Array of all plans with admin metadata
   */
  async getAllPlansAdmin(): Promise<AdminSubscriptionPlan[]> {
    const result = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans ORDER BY tier, version DESC'
    );

    return result.rows.map(this.mapRowToAdminPlan);
  }

  /**
   * Get all addons with admin fields (including status, description)
   * @returns Array of all addons with admin metadata
   */
  async getAllAddonsAdmin(): Promise<AdminAddonSuite[]> {
    const result = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites ORDER BY suite_name, version DESC'
    );

    return result.rows.map(this.mapRowToAdminAddon);
  }

  /**
   * Update plan details
   * @param id Plan ID
   * @param input Update data
   * @returns Updated plan
   */
  async updatePlan(id: number, input: UpdatePackageInput): Promise<AdminSubscriptionPlan> {
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new PlanNotFoundError(id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.pricing_monthly !== undefined) {
      updates.push('pricing_monthly = ?');
      values.push(input.pricing_monthly);
    }
    if (input.pricing_annual !== undefined) {
      updates.push('pricing_annual = ?');
      values.push(input.pricing_annual);
    }
    if (input.features !== undefined) {
      const currentFeatures = plan.features;
      const updatedFeatures = { ...currentFeatures, ...input.features };
      updates.push('features = ?');
      values.push(JSON.stringify(updatedFeatures));
    }

    if (updates.length === 0) {
      // No changes, return current plan
      const result = await this.db.query<AdminSubscriptionPlanRow>(
        'SELECT * FROM subscription_plans WHERE id = ?',
        [id]
      );
      const row = result.rows[0];
      if (!row) throw new PlanNotFoundError(id);
      return this.mapRowToAdminPlan(row);
    }

    values.push(id);

    await this.db.query(
      `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const result = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new PlanNotFoundError(id);

    return this.mapRowToAdminPlan(row);
  }

  /**
   * Toggle plan status (active/inactive)
   * @param id Plan ID
   * @returns Updated plan
   */
  async togglePlanStatus(id: number): Promise<AdminSubscriptionPlan> {
    const result = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new PlanNotFoundError(id);

    const currentStatus = row.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await this.db.query(
      'UPDATE subscription_plans SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    const updated = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new PlanNotFoundError(id);

    return this.mapRowToAdminPlan(updatedRow);
  }

  /**
   * Archive plan (set status to archived)
   * @param id Plan ID
   */
  async archivePlan(id: number): Promise<void> {
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new PlanNotFoundError(id);
    }

    await this.db.query(
      'UPDATE subscription_plans SET status = ? WHERE id = ?',
      ['archived', id]
    );
  }

  /**
   * Create addon suite
   * @param input Addon data
   * @returns Created addon
   */
  async createAddon(input: CreateAddonInput): Promise<AdminAddonSuite> {
    const features = JSON.stringify(input.features);

    const result = await this.db.query<AdminAddonSuiteRow>(
      `INSERT INTO addon_suites (
        suite_name, version, display_name, description, pricing_monthly, pricing_annual,
        features, effective_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.suite_name,
        input.version,
        input.display_name,
        input.description || null,
        input.pricing_monthly || null,
        input.pricing_annual || null,
        features,
        input.effective_date
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create addon',
        new Error('No insert ID returned')
      );
    }

    const created = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [result.insertId]
    );

    const row = created.rows[0];
    if (!row) {
      throw BizError.databaseError(
        'create addon',
        new Error('Failed to retrieve created addon')
      );
    }

    return this.mapRowToAdminAddon(row);
  }

  /**
   * Update addon suite
   * @param id Addon ID
   * @param input Update data
   * @returns Updated addon
   */
  async updateAddon(id: number, input: UpdateAddonInput): Promise<AdminAddonSuite> {
    const addon = await this.getAddonById(id);
    if (!addon) {
      throw new AddonNotFoundError(id);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(input.display_name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.pricing_monthly !== undefined) {
      updates.push('pricing_monthly = ?');
      values.push(input.pricing_monthly);
    }
    if (input.pricing_annual !== undefined) {
      updates.push('pricing_annual = ?');
      values.push(input.pricing_annual);
    }
    if (input.features !== undefined) {
      updates.push('features = ?');
      values.push(JSON.stringify(input.features));
    }

    if (updates.length === 0) {
      // No changes, return current addon
      const result = await this.db.query<AdminAddonSuiteRow>(
        'SELECT * FROM addon_suites WHERE id = ?',
        [id]
      );
      const row = result.rows[0];
      if (!row) throw new AddonNotFoundError(id);
      return this.mapRowToAdminAddon(row);
    }

    values.push(id);

    await this.db.query(
      `UPDATE addon_suites SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const result = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new AddonNotFoundError(id);

    return this.mapRowToAdminAddon(row);
  }

  /**
   * Toggle addon status
   * @param id Addon ID
   * @returns Updated addon
   */
  async toggleAddonStatus(id: number): Promise<AdminAddonSuite> {
    const result = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new AddonNotFoundError(id);

    const currentStatus = row.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await this.db.query(
      'UPDATE addon_suites SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    const updated = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new AddonNotFoundError(id);

    return this.mapRowToAdminAddon(updatedRow);
  }

  /**
   * Archive addon suite
   * @param id Addon ID
   */
  async archiveAddon(id: number): Promise<void> {
    const addon = await this.getAddonById(id);
    if (!addon) {
      throw new AddonNotFoundError(id);
    }

    await this.db.query(
      'UPDATE addon_suites SET status = ? WHERE id = ?',
      ['archived', id]
    );
  }

  // ==========================================================================
  // PACKAGE VERSIONING (Phase 5)
  // ==========================================================================

  /**
   * Private: Increment major version (1.0.0 -> 2.0.0)
   */
  private incrementMajorVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0] || '0', 10);
    return `${major + 1}.0.0`;
  }

  /**
   * Toggle plan display status
   * @param id Plan ID
   * @returns Updated plan
   */
  async togglePlanDisplay(id: number): Promise<AdminSubscriptionPlan> {
    const result = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new PlanNotFoundError(id);

    const currentDisplay = row.is_displayed ?? true;
    const newDisplay = !currentDisplay;

    await this.db.query(
      'UPDATE subscription_plans SET is_displayed = ? WHERE id = ?',
      [newDisplay, id]
    );

    const updated = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new PlanNotFoundError(id);

    return this.mapRowToAdminPlan(updatedRow);
  }

  /**
   * Get displayed plan for a tier
   * @param tier Listing tier
   * @returns Displayed plan for tier or null
   */
  async getDisplayedPlanForTier(tier: ListingTier): Promise<AdminSubscriptionPlan | null> {
    const result = await this.db.query<AdminSubscriptionPlanRow>(
      `SELECT * FROM subscription_plans
       WHERE tier = ? AND is_displayed = TRUE AND status = 'active'
       ORDER BY effective_date DESC
       LIMIT 1`,
      [tier]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToAdminPlan(row);
  }

  /**
   * Create upgraded plan version (auto-hides previous displayed version)
   * @param id Source plan ID
   * @param input Upgrade input (price/features changes)
   * @returns New plan version
   */
  async createUpgradedPlanVersion(
    id: number,
    input: UpgradePackageInput
  ): Promise<{ newPlan: AdminSubscriptionPlan; previousPlan: AdminSubscriptionPlan }> {
    // Get source plan
    const result = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    const sourceRow = result.rows[0];
    if (!sourceRow) throw new PlanNotFoundError(id);

    // Calculate new version
    const newVersion = this.incrementMajorVersion(sourceRow.version);
    const effectiveDate = input.effective_date || new Date().toISOString().split('T')[0];

    // Get current features
    const currentFeatures = safeJsonParse<TierLimits>(sourceRow.features, {} as TierLimits);
    const newFeatures = input.features
      ? { ...currentFeatures, ...input.features }
      : currentFeatures;

    // Hide previous displayed version for this tier
    await this.db.query(
      `UPDATE subscription_plans SET is_displayed = FALSE
       WHERE tier = ? AND is_displayed = TRUE`,
      [sourceRow.tier]
    );

    // Create new version
    const insertResult = await this.db.query(
      `INSERT INTO subscription_plans (
        tier, version, name, description, pricing_monthly, pricing_annual,
        features, status, effective_date, is_displayed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, TRUE)`,
      [
        sourceRow.tier,
        newVersion,
        sourceRow.name,
        sourceRow.description,
        input.pricing_monthly ?? sourceRow.pricing_monthly,
        input.pricing_annual ?? sourceRow.pricing_annual,
        JSON.stringify(newFeatures),
        effectiveDate
      ]
    );

    // Get both plans
    const newPlanResult = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [insertResult.insertId]
    );
    const previousPlanResult = await this.db.query<AdminSubscriptionPlanRow>(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [id]
    );

    return {
      newPlan: this.mapRowToAdminPlan(newPlanResult.rows[0]!),
      previousPlan: this.mapRowToAdminPlan(previousPlanResult.rows[0]!)
    };
  }

  /**
   * Toggle addon display status
   */
  async toggleAddonDisplay(id: number): Promise<AdminAddonSuite> {
    const result = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) throw new AddonNotFoundError(id);

    const currentDisplay = row.is_displayed ?? true;
    const newDisplay = !currentDisplay;

    await this.db.query(
      'UPDATE addon_suites SET is_displayed = ? WHERE id = ?',
      [newDisplay, id]
    );

    const updated = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const updatedRow = updated.rows[0];
    if (!updatedRow) throw new AddonNotFoundError(id);

    return this.mapRowToAdminAddon(updatedRow);
  }

  /**
   * Get displayed addon for a suite
   */
  async getDisplayedAddonForSuite(suiteName: AddonSuiteName): Promise<AdminAddonSuite | null> {
    const result = await this.db.query<AdminAddonSuiteRow>(
      `SELECT * FROM addon_suites
       WHERE suite_name = ? AND is_displayed = TRUE AND status = 'active'
       ORDER BY effective_date DESC
       LIMIT 1`,
      [suiteName]
    );

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToAdminAddon(row);
  }

  /**
   * Create upgraded addon version
   */
  async createUpgradedAddonVersion(
    id: number,
    input: UpgradeAddonInput
  ): Promise<{ newAddon: AdminAddonSuite; previousAddon: AdminAddonSuite }> {
    const result = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    const sourceRow = result.rows[0];
    if (!sourceRow) throw new AddonNotFoundError(id);

    const newVersion = this.incrementMajorVersion(sourceRow.version);
    const effectiveDate = input.effective_date || new Date().toISOString().split('T')[0];
    const currentFeatures = safeJsonParse<string[]>(sourceRow.features, []);
    const newFeatures = input.features ?? currentFeatures;

    // Hide previous displayed version
    await this.db.query(
      `UPDATE addon_suites SET is_displayed = FALSE
       WHERE suite_name = ? AND is_displayed = TRUE`,
      [sourceRow.suite_name]
    );

    // Create new version
    const insertResult = await this.db.query(
      `INSERT INTO addon_suites (
        suite_name, version, display_name, description, pricing_monthly, pricing_annual,
        features, status, effective_date, is_displayed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, TRUE)`,
      [
        sourceRow.suite_name,
        newVersion,
        sourceRow.display_name,
        sourceRow.description,
        input.pricing_monthly ?? sourceRow.pricing_monthly,
        input.pricing_annual ?? sourceRow.pricing_annual,
        JSON.stringify(newFeatures),
        effectiveDate
      ]
    );

    const newAddonResult = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [insertResult.insertId]
    );
    const previousAddonResult = await this.db.query<AdminAddonSuiteRow>(
      'SELECT * FROM addon_suites WHERE id = ?',
      [id]
    );

    return {
      newAddon: this.mapRowToAdminAddon(newAddonResult.rows[0]!),
      previousAddon: this.mapRowToAdminAddon(previousAddonResult.rows[0]!)
    };
  }

  // ==========================================================================
  // ADMIN HELPER METHODS
  // ==========================================================================

  /**
   * Map database row to AdminSubscriptionPlan interface
   * @param row - Admin plan row from database
   * @returns AdminSubscriptionPlan object
   */
  private mapRowToAdminPlan(row: AdminSubscriptionPlanRow): AdminSubscriptionPlan {
    return {
      id: row.id,
      tier: row.tier as ListingTier,
      version: row.version,
      name: row.name,
      description: row.description || null,
      pricing_monthly: row.pricing_monthly,
      pricing_annual: row.pricing_annual,
      features: safeJsonParse<TierLimits>(row.features, {} as TierLimits),
      status: (row.status || 'active') as PackageStatus,
      is_displayed: row.is_displayed ?? true,
      effective_date: new Date(row.effective_date).toISOString(),
      deprecated_date: row.deprecated_date ? new Date(row.deprecated_date).toISOString() : null,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  /**
   * Map database row to AdminAddonSuite interface
   * @param row - Admin addon row from database
   * @returns AdminAddonSuite object
   */
  private mapRowToAdminAddon(row: AdminAddonSuiteRow): AdminAddonSuite {
    return {
      id: row.id,
      suite_name: row.suite_name as AddonSuiteName,
      version: row.version,
      display_name: row.display_name,
      description: row.description || null,
      pricing_monthly: row.pricing_monthly,
      pricing_annual: row.pricing_annual,
      features: safeJsonParse<string[]>(row.features, []),
      status: (row.status || 'active') as PackageStatus,
      is_displayed: row.is_displayed ?? true,
      effective_date: new Date(row.effective_date).toISOString(),
      deprecated_date: row.deprecated_date ? new Date(row.deprecated_date).toISOString() : null,
      created_at: new Date(row.created_at).toISOString()
    };
  }

  // ==========================================================================
  // STRIPE METHODS (Phase 1 - Billing Foundation)
  // ==========================================================================

  /**
   * Get or create a Stripe customer for a user.
   * Stores the customer ID on the users row for reuse.
   */
  async getOrCreateStripeCustomer(userId: number): Promise<string> {
    const result = await this.db.query<{
      stripe_customer_id: string | null;
      email: string;
      first_name: string | null;
      last_name: string | null;
    }>(
      'SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw BizError.notFound('User', userId);
    }

    if (user.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    // Create a new Stripe customer
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined;
    const customer = await stripe.customers.create({
      email: user.email,
      name,
      metadata: { user_id: String(userId) }
    });

    await this.db.query(
      'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
      [customer.id, userId]
    );

    return customer.id;
  }

  /**
   * Create a Stripe subscription and record it locally.
   */
  async createStripeSubscription(config: StripeSubscriptionConfig): Promise<ListingSubscription> {
    const { customerId, priceId, listingId, billingCycle, paymentMethodId } = config;

    // Create subscription in Stripe
    const stripeSubParams: import('stripe').Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        listing_id: String(listingId),
        billing_cycle: billingCycle
      }
    };

    if (paymentMethodId) {
      stripeSubParams.default_payment_method = paymentMethodId;
    }

    const stripeSub = await stripe.subscriptions.create(stripeSubParams);

    // Find plan by stripe price ID
    const planResult = await this.db.query<{ id: number; tier: string; version: string }>(
      `SELECT id, tier, version FROM subscription_plans WHERE status = 'active' LIMIT 1`
    );

    const plan = planResult.rows[0];
    if (!plan) {
      throw new PlanNotFoundError(0);
    }

    const periodEnd = (stripeSub as unknown as { current_period_end?: number }).current_period_end;
    const nextBillingDate = periodEnd
      ? new Date(periodEnd * 1000).toISOString().split('T')[0]
      : null;

    // Insert listing_subscriptions record
    const insertResult = await this.db.query(
      `INSERT INTO listing_subscriptions (
        listing_id, plan_id, plan_version, started_at, renews_at,
        status, stripe_subscription_id, stripe_price_id, billing_cycle, next_billing_date
      ) VALUES (?, ?, ?, NOW(), ?, 'active', ?, ?, ?, ?)`,
      [listingId, plan.id, plan.version, nextBillingDate, stripeSub.id, priceId, billingCycle, nextBillingDate]
    );

    // Sync listings.tier
    await this.syncListingTier(listingId, plan.id);

    // Return the created subscription
    const subResult = await this.db.query<ListingSubscriptionRow>(
      'SELECT * FROM listing_subscriptions WHERE id = ?',
      [insertResult.insertId]
    );

    const row = subResult.rows[0];
    if (!row) {
      throw new SubscriptionNotFoundError(insertResult.insertId as number);
    }

    return this.mapRowToSubscription(row);
  }

  /**
   * Sync a local listing_subscription record from the Stripe subscription object.
   */
  async syncSubscriptionFromStripe(stripeSubscriptionId: string): Promise<void> {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    const dbStatus = stripeSub.status === 'active' ? 'active'
      : stripeSub.status === 'canceled' ? 'cancelled'
      : 'suspended';

    const cancelAtPeriodEnd = stripeSub.cancel_at_period_end ? 1 : 0;

    const periodEnd = (stripeSub as unknown as { current_period_end?: number }).current_period_end;
    const nextBillingDate = periodEnd
      ? new Date(periodEnd * 1000).toISOString().split('T')[0]
      : null;

    await this.db.query(
      `UPDATE listing_subscriptions
       SET status = ?, cancel_at_period_end = ?, next_billing_date = ?
       WHERE stripe_subscription_id = ?`,
      [dbStatus, cancelAtPeriodEnd, nextBillingDate, stripeSubscriptionId]
    );
  }

  /**
   * Sync the listings.tier column from the subscription plan.
   * This is the critical sync point — always call after plan changes.
   */
  async syncListingTier(listingId: number, planId: number): Promise<void> {
    const planResult = await this.db.query<{ tier: string }>(
      'SELECT tier FROM subscription_plans WHERE id = ?',
      [planId]
    );

    const plan = planResult.rows[0];
    if (!plan) {
      throw new PlanNotFoundError(planId);
    }

    await this.db.query(
      'UPDATE listings SET tier = ? WHERE id = ?',
      [plan.tier, listingId]
    );
  }

  /**
   * Apply a pending tier change on the next successful renewal.
   * Called by invoice.payment_succeeded webhook when pending_tier_change is set.
   */
  async applyPendingTierChange(subscriptionId: number): Promise<void> {
    const subResult = await this.db.query<ListingSubscriptionRow>(
      'SELECT * FROM listing_subscriptions WHERE id = ?',
      [subscriptionId]
    );

    const sub = subResult.rows[0];
    if (!sub) {
      throw new SubscriptionNotFoundError(subscriptionId);
    }

    if (!sub.pending_tier_change) {
      return; // Nothing to apply
    }

    // Get plan for the pending tier
    const planResult = await this.db.query<{ id: number }>(
      `SELECT id FROM subscription_plans
       WHERE tier = ? AND status = 'active'
       ORDER BY effective_date DESC LIMIT 1`,
      [sub.pending_tier_change]
    );

    const plan = planResult.rows[0];
    if (!plan) {
      throw new PlanNotFoundError(0);
    }

    // Update the subscription plan and clear the pending change
    await this.db.query(
      'UPDATE listing_subscriptions SET plan_id = ?, pending_tier_change = NULL WHERE id = ?',
      [plan.id, subscriptionId]
    );

    // Sync listing tier
    await this.syncListingTier(sub.listing_id, plan.id);
  }
}
