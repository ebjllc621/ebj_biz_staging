/**
 * BillingService - Core billing operations for subscriptions
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 2
 * @tier ENTERPRISE
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary (no direct DB in routes)
 * - BizError for all error handling
 * - Stripe tokens only (no card data stored)
 * - All mutations use db.transaction() for atomicity
 * - IDOR prevention via validateListingOwnership
 * - DECIMAL columns (amount, tax_amount, tax_rate) parsed via parseFloat
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { stripe } from '@core/config/stripe';
import { bigIntToNumber } from '@core/utils/bigint';
import { safeJsonParse } from '@core/utils/bigint';
import type { BillingTransactionRow, ListingSubscriptionRow } from '@core/types/db-rows';
import type {
  BillingTransaction,
  CreateBillingTransactionInput,
  SubscriptionPurchaseInput,
  SubscriptionChangeResult,
  TransactionType,
  TransactionStatus
} from '@core/types/subscription';
import type { ListingSubscription } from '@core/types/subscription';
import { SubscriptionService } from '@core/services/SubscriptionService';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class BillingError extends BizError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'BILLING_ERROR',
      message,
      context,
      userMessage: 'A billing error occurred'
    });
  }
}

export class SubscriptionAlreadyActiveError extends BizError {
  constructor(listingId: number) {
    super({
      code: 'SUBSCRIPTION_ALREADY_ACTIVE',
      message: `Listing ${listingId} already has an active subscription`,
      context: { listingId },
      userMessage: 'This listing already has an active subscription'
    });
  }
}

export class InvalidTierChangeError extends BizError {
  constructor(from: string, to: string, direction: string) {
    super({
      code: 'INVALID_TIER_CHANGE',
      message: `Cannot ${direction}: ${from} → ${to}`,
      context: { from, to, direction },
      userMessage: `Invalid subscription ${direction}`
    });
  }
}

// ============================================================================
// BillingService
// ============================================================================

export class BillingService {
  constructor(private db: DatabaseService) {}

  // ==========================================================================
  // TRANSACTION RECORDING
  // ==========================================================================

  /**
   * Record a billing transaction in the database.
   * Generates invoice number and statement month automatically.
   */
  async recordTransaction(input: CreateBillingTransactionInput): Promise<BillingTransaction> {
    const invoiceNumber = input.invoiceNumber ?? (await this.generateInvoiceNumber());
    const now = new Date();
    const statementMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const insertResult = await this.db.query(
      `INSERT INTO billing_transactions (
        user_id, listing_id, transaction_type, amount, currency, status,
        subscription_id, addon_id, stripe_charge_id, stripe_invoice_id,
        stripe_payment_intent_id, description, invoice_number, tax_amount,
        tax_rate, statement_month, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.listingId ?? null,
        input.transactionType,
        input.amount,
        input.currency ?? 'usd',
        input.status ?? 'completed',
        input.subscriptionId ?? null,
        input.addonId ?? null,
        input.stripeChargeId ?? null,
        input.stripeInvoiceId ?? null,
        input.stripePaymentIntentId ?? null,
        input.description,
        invoiceNumber,
        input.taxAmount ?? 0,
        input.taxRate ?? null,
        statementMonth,
        input.metadata ? JSON.stringify(input.metadata) : null
      ]
    );

    const newId = insertResult.insertId as number;
    return this.getTransactionById(newId, input.userId);
  }

  /**
   * Generate a unique invoice number for the current month.
   * Format: BK-YYYY-MM-SEQ (e.g., BK-2026-03-001)
   */
  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `BK-${yearMonth}-`;

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM billing_transactions WHERE statement_month = ?`,
      [yearMonth]
    );

    const count = bigIntToNumber(countResult.rows[0]?.total);
    const seq = String(count + 1).padStart(3, '0');
    return `${prefix}${seq}`;
  }

  // ==========================================================================
  // SUBSCRIPTION OPERATIONS
  // ==========================================================================

  /**
   * Purchase a new subscription for a listing.
   * Validates ownership, checks for existing subscription, creates Stripe subscription.
   */
  async purchaseSubscription(
    userId: number,
    input: SubscriptionPurchaseInput
  ): Promise<SubscriptionChangeResult> {
    await this.validateListingOwnership(userId, input.listingId);

    // Check no active subscription exists
    const existing = await this.getSubscriptionForListing(input.listingId);
    if (existing) {
      throw new SubscriptionAlreadyActiveError(input.listingId);
    }

    // Get plan
    const subscriptionService = new SubscriptionService(this.db);
    const plan = await subscriptionService.getPlanById(input.planId);
    if (!plan) {
      throw BizError.notFound('SubscriptionPlan', input.planId);
    }

    // Get or create Stripe customer
    const customerId = await subscriptionService.getOrCreateStripeCustomer(userId);

    // Determine price ID based on billing cycle
    const priceId = input.billingCycle === 'annual'
      ? (plan as unknown as { stripe_price_id_annual?: string }).stripe_price_id_annual ?? ''
      : (plan as unknown as { stripe_price_id_monthly?: string }).stripe_price_id_monthly ?? '';

    // Create Stripe subscription
    const subscription = await subscriptionService.createStripeSubscription({
      customerId,
      priceId: priceId || `price_${plan.tier}_${input.billingCycle}`,
      listingId: input.listingId,
      billingCycle: input.billingCycle,
      paymentMethodId: input.paymentMethodId
    });

    // Record billing transaction
    const transactionAmount = input.billingCycle === 'annual'
      ? (plan.pricing_annual ?? 0)
      : (plan.pricing_monthly ?? 0);

    const transaction = await this.recordTransaction({
      userId,
      listingId: input.listingId,
      transactionType: 'subscription_charge',
      amount: transactionAmount,
      status: 'completed',
      subscriptionId: subscription.id,
      description: `${plan.name} subscription (${input.billingCycle})`,
      metadata: {
        plan_id: plan.id,
        plan_tier: plan.tier,
        billing_cycle: input.billingCycle
      }
    });

    // Non-blocking: notify user of new subscription
    try {
      const NotificationServiceModule = await import('@core/services/NotificationService');
      const notificationService = new NotificationServiceModule.NotificationService(this.db);
      await notificationService.dispatch({
        type: 'billing.plan_created' as import('@core/services/notification/types').NotificationEventType,
        recipientId: userId,
        title: 'Subscription Activated',
        message: `Your ${plan.name} subscription is now active`,
        actionUrl: '/dashboard/account/subscription-overview',
        priority: 'normal'
      });
    } catch { /* Non-blocking */ }

    return {
      subscription,
      transaction,
      effectiveDate: new Date(),
      message: `Successfully subscribed to ${plan.name}`
    };
  }

  /**
   * Upgrade a subscription immediately to a higher tier.
   * Updates Stripe subscription with proration, syncs listing tier.
   */
  async upgradeSubscription(
    userId: number,
    listingId: number,
    newPlanId: number
  ): Promise<SubscriptionChangeResult> {
    await this.validateListingOwnership(userId, listingId);

    return this.db.transaction(async (client) => {
      // Lock the subscription row
      const subResult = await client.query<ListingSubscriptionRow>(
        `SELECT * FROM listing_subscriptions WHERE listing_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
        [listingId]
      );

      const subRow = subResult.rows[0];
      if (!subRow) {
        throw BizError.notFound('Subscription', listingId);
      }

      const subscriptionService = new SubscriptionService(this.db);
      const currentPlan = await subscriptionService.getPlanById(subRow.plan_id);
      const newPlan = await subscriptionService.getPlanById(newPlanId);

      if (!currentPlan || !newPlan) {
        throw BizError.notFound('SubscriptionPlan', newPlanId);
      }

      const currentRank = this.getTierRank(currentPlan.tier);
      const newRank = this.getTierRank(newPlan.tier);

      if (newRank <= currentRank) {
        throw new InvalidTierChangeError(currentPlan.tier, newPlan.tier, 'upgrade');
      }

      // Update Stripe subscription if one exists
      if (subRow.stripe_subscription_id) {
        const stripeSub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
        const items = (stripeSub as unknown as { items?: { data?: Array<{ id: string }> } }).items?.data;
        const stripeItemId = items?.[0]?.id;

        if (stripeItemId) {
          const newPriceId = subRow.billing_cycle === 'annual'
            ? (newPlan as unknown as { stripe_price_id_annual?: string }).stripe_price_id_annual
            : (newPlan as unknown as { stripe_price_id_monthly?: string }).stripe_price_id_monthly;

          if (newPriceId) {
            await stripe.subscriptions.update(subRow.stripe_subscription_id, {
              items: [{ id: stripeItemId, price: newPriceId }],
              proration_behavior: 'create_prorations'
            });
          }
        }
      }

      // Update subscription plan
      await client.query(
        `UPDATE listing_subscriptions SET plan_id = ?, plan_version = ?, updated_at = NOW() WHERE id = ?`,
        [newPlanId, newPlan.version, subRow.id]
      );

      // Sync listing tier immediately
      await subscriptionService.syncListingTier(listingId, newPlanId);

      // Fetch updated subscription
      const updatedResult = await client.query<ListingSubscriptionRow>(
        'SELECT * FROM listing_subscriptions WHERE id = ?',
        [subRow.id]
      );
      const updatedRow = updatedResult.rows[0];
      if (!updatedRow) {
        throw BizError.notFound('Subscription', subRow.id);
      }

      const updatedSub = this.mapRowToListingSubscription(updatedRow);

      // Record prorated transaction
      const transaction = await this.recordTransaction({
        userId,
        listingId,
        transactionType: 'subscription_charge',
        amount: 0, // Proration handled by Stripe
        status: 'pending',
        subscriptionId: subRow.id,
        description: `Upgrade from ${currentPlan.tier} to ${newPlan.tier} (prorated)`,
        metadata: {
          from_plan_id: currentPlan.id,
          to_plan_id: newPlan.id,
          from_tier: currentPlan.tier,
          to_tier: newPlan.tier,
          proration: true
        }
      });

      // Non-blocking: notify user of upgrade
      try {
        const NotificationServiceModule = await import('@core/services/NotificationService');
        const notificationService = new NotificationServiceModule.NotificationService(this.db);
        await notificationService.dispatch({
          type: 'billing.plan_upgraded' as import('@core/services/notification/types').NotificationEventType,
          recipientId: userId,
          title: 'Subscription Upgraded',
          message: `Your subscription has been upgraded from ${currentPlan.tier} to ${newPlan.tier}`,
          actionUrl: '/dashboard/account/subscription-overview',
          priority: 'normal'
        });
      } catch { /* Non-blocking */ }

      return {
        subscription: updatedSub,
        transaction,
        effectiveDate: new Date(),
        message: `Upgraded from ${currentPlan.tier} to ${newPlan.tier}`
      };
    });
  }

  /**
   * Downgrade a subscription at period end (does not change tier immediately).
   * Sets pending_tier_change and schedules Stripe update at period end.
   */
  async downgradeSubscription(
    userId: number,
    listingId: number,
    newPlanId: number
  ): Promise<SubscriptionChangeResult> {
    await this.validateListingOwnership(userId, listingId);

    return this.db.transaction(async (client) => {
      // Lock the subscription row
      const subResult = await client.query<ListingSubscriptionRow>(
        `SELECT * FROM listing_subscriptions WHERE listing_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
        [listingId]
      );

      const subRow = subResult.rows[0];
      if (!subRow) {
        throw BizError.notFound('Subscription', listingId);
      }

      const subscriptionService = new SubscriptionService(this.db);
      const currentPlan = await subscriptionService.getPlanById(subRow.plan_id);
      const newPlan = await subscriptionService.getPlanById(newPlanId);

      if (!currentPlan || !newPlan) {
        throw BizError.notFound('SubscriptionPlan', newPlanId);
      }

      const currentRank = this.getTierRank(currentPlan.tier);
      const newRank = this.getTierRank(newPlan.tier);

      if (newRank >= currentRank) {
        throw new InvalidTierChangeError(currentPlan.tier, newPlan.tier, 'downgrade');
      }

      // Schedule Stripe subscription update at period end
      if (subRow.stripe_subscription_id) {
        const stripeSub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
        const items = (stripeSub as unknown as { items?: { data?: Array<{ id: string }> } }).items?.data;
        const stripeItemId = items?.[0]?.id;

        if (stripeItemId) {
          const newPriceId = subRow.billing_cycle === 'annual'
            ? (newPlan as unknown as { stripe_price_id_annual?: string }).stripe_price_id_annual
            : (newPlan as unknown as { stripe_price_id_monthly?: string }).stripe_price_id_monthly;

          if (newPriceId) {
            await stripe.subscriptions.update(subRow.stripe_subscription_id, {
              items: [{ id: stripeItemId, price: newPriceId }],
              proration_behavior: 'none',
              billing_cycle_anchor: 'unchanged' as unknown as 'now'
            });
          }
        }
      }

      // Set pending_tier_change (do NOT change tier now)
      await client.query(
        `UPDATE listing_subscriptions SET pending_tier_change = ?, updated_at = NOW() WHERE id = ?`,
        [newPlan.tier, subRow.id]
      );

      // Fetch updated subscription
      const updatedResult = await client.query<ListingSubscriptionRow>(
        'SELECT * FROM listing_subscriptions WHERE id = ?',
        [subRow.id]
      );
      const updatedRow = updatedResult.rows[0];
      if (!updatedRow) {
        throw BizError.notFound('Subscription', subRow.id);
      }

      const updatedSub = this.mapRowToListingSubscription(updatedRow);
      const effectiveDate = updatedSub.renews_at ?? new Date();

      // Non-blocking: notify user of downgrade
      try {
        const NotificationServiceModule = await import('@core/services/NotificationService');
        const notificationService = new NotificationServiceModule.NotificationService(this.db);
        await notificationService.dispatch({
          type: 'billing.plan_downgraded' as import('@core/services/notification/types').NotificationEventType,
          recipientId: userId,
          title: 'Subscription Downgrade Scheduled',
          message: `Your subscription will change from ${currentPlan.tier} to ${newPlan.tier} on ${effectiveDate.toISOString().split('T')[0]}`,
          actionUrl: '/dashboard/account/subscription-overview',
          priority: 'normal'
        });
      } catch { /* Non-blocking */ }

      return {
        subscription: updatedSub,
        transaction: null,
        effectiveDate,
        message: `Downgrade to ${newPlan.tier} scheduled for ${effectiveDate.toISOString().split('T')[0]}`
      };
    });
  }

  /**
   * Cancel subscription at period end.
   * Sets cancel_at_period_end on Stripe and locally.
   */
  async cancelSubscription(
    userId: number,
    listingId: number
  ): Promise<SubscriptionChangeResult> {
    await this.validateListingOwnership(userId, listingId);

    return this.db.transaction(async (client) => {
      // Lock the subscription row
      const subResult = await client.query<ListingSubscriptionRow>(
        `SELECT * FROM listing_subscriptions WHERE listing_id = ? AND status = 'active' LIMIT 1 FOR UPDATE`,
        [listingId]
      );

      const subRow = subResult.rows[0];
      if (!subRow) {
        throw BizError.notFound('Subscription', listingId);
      }

      // Set cancel_at_period_end on Stripe
      if (subRow.stripe_subscription_id) {
        await stripe.subscriptions.update(subRow.stripe_subscription_id, {
          cancel_at_period_end: true
        });
      }

      // Set cancel_at_period_end locally
      await client.query(
        `UPDATE listing_subscriptions SET cancel_at_period_end = 1, updated_at = NOW() WHERE id = ?`,
        [subRow.id]
      );

      // Fetch updated subscription
      const updatedResult = await client.query<ListingSubscriptionRow>(
        'SELECT * FROM listing_subscriptions WHERE id = ?',
        [subRow.id]
      );
      const updatedRow = updatedResult.rows[0];
      if (!updatedRow) {
        throw BizError.notFound('Subscription', subRow.id);
      }

      const updatedSub = this.mapRowToListingSubscription(updatedRow);
      const effectiveDate = updatedSub.renews_at ?? new Date();

      // Non-blocking: notify user of cancellation
      try {
        const NotificationServiceModule = await import('@core/services/NotificationService');
        const notificationService = new NotificationServiceModule.NotificationService(this.db);
        await notificationService.dispatch({
          type: 'billing.plan_downgraded' as import('@core/services/notification/types').NotificationEventType,
          recipientId: userId,
          title: 'Subscription Cancelled',
          message: `Your subscription has been cancelled. Access continues until ${effectiveDate.toISOString().split('T')[0]}`,
          actionUrl: '/dashboard/account/subscription-overview',
          priority: 'normal'
        });
      } catch { /* Non-blocking */ }

      return {
        subscription: updatedSub,
        transaction: null,
        effectiveDate,
        message: `Subscription cancelled. Access continues until ${effectiveDate.toISOString().split('T')[0]}`
      };
    });
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get active subscription for a listing.
   */
  async getSubscriptionForListing(listingId: number): Promise<ListingSubscription | null> {
    const result = await this.db.query<ListingSubscriptionRow>(
      `SELECT * FROM listing_subscriptions WHERE listing_id = ? AND status = 'active' LIMIT 1`,
      [listingId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToListingSubscription(row);
  }

  /**
   * Get paginated billing transactions for a user.
   * Optionally filtered by listing_id.
   */
  async getTransactionsForUser(
    userId: number,
    options?: { listingId?: number; page?: number; pageSize?: number }
  ): Promise<{ items: BillingTransaction[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const whereClauses = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (options?.listingId !== undefined) {
      whereClauses.push('listing_id = ?');
      params.push(options.listingId);
    }

    const whereStr = whereClauses.join(' AND ');

    const countResult = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM billing_transactions WHERE ${whereStr}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const rowsResult = await this.db.query<BillingTransactionRow>(
      `SELECT * FROM billing_transactions WHERE ${whereStr} ORDER BY transaction_date DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      items: rowsResult.rows.map(row => this.mapRowToTransaction(row)),
      total
    };
  }

  /**
   * Get a single transaction by ID, scoped to user (IDOR prevention).
   */
  async getTransactionById(id: number, userId: number): Promise<BillingTransaction> {
    const result = await this.db.query<BillingTransactionRow>(
      'SELECT * FROM billing_transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('BillingTransaction', id);
    }
    return this.mapRowToTransaction(row);
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Map a BillingTransactionRow to a BillingTransaction domain object.
   * DECIMAL columns come as strings from mariadb — use parseFloat.
   */
  mapRowToTransaction(row: BillingTransactionRow): BillingTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      listingId: row.listing_id,
      transactionType: row.transaction_type as TransactionType,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status as TransactionStatus,
      subscriptionId: row.subscription_id,
      addonId: row.addon_id,
      stripeChargeId: row.stripe_charge_id,
      stripeInvoiceId: row.stripe_invoice_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      description: row.description,
      invoiceNumber: row.invoice_number,
      taxAmount: parseFloat(row.tax_amount),
      taxRate: row.tax_rate !== null ? parseFloat(row.tax_rate) : null,
      transactionDate: new Date(row.transaction_date),
      dueDate: row.due_date ? new Date(row.due_date) : null,
      paidDate: row.paid_date ? new Date(row.paid_date) : null,
      receiptUrl: row.receipt_url,
      statementMonth: row.statement_month,
      metadata: row.metadata ? safeJsonParse<Record<string, unknown>>(row.metadata, {}) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Map a ListingSubscriptionRow to a ListingSubscription domain object.
   * Used within BillingService for transaction-scoped queries.
   */
  private mapRowToListingSubscription(row: ListingSubscriptionRow): ListingSubscription {
    return {
      id: row.id,
      listing_id: row.listing_id,
      plan_id: row.plan_id,
      plan_version: row.plan_version,
      started_at: new Date(row.started_at),
      renews_at: row.renews_at ? new Date(row.renews_at) : null,
      is_grandfathered: Boolean(row.is_grandfathered),
      override_features: row.override_features
        ? safeJsonParse(row.override_features, null)
        : null,
      status: row.status as import('@core/types/subscription').SubscriptionStatus,
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

  /**
   * Validate that a user owns a listing. Throws BizError.forbidden if not.
   */
  async validateListingOwnership(userId: number, listingId: number): Promise<void> {
    const result = await this.db.query<{ user_id: number }>(
      'SELECT user_id FROM listings WHERE id = ?',
      [listingId]
    );
    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('Listing', listingId);
    }
    if (row.user_id !== userId) {
      throw BizError.forbidden('You do not own this listing');
    }
  }

  /**
   * Get numeric rank for a tier to compare upgrade/downgrade direction.
   * essentials=0, plus=1, preferred=2, premium=3
   */
  getTierRank(tier: string): number {
    const ranks: Record<string, number> = {
      essentials: 0,
      plus: 1,
      preferred: 2,
      premium: 3
    };
    return ranks[tier] ?? -1;
  }
}
