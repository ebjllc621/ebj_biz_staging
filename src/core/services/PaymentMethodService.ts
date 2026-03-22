/**
 * PaymentMethodService - Manages Stripe payment methods for users
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 1
 * @tier ENTERPRISE
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary (no direct DB in routes)
 * - BizError for all error handling
 * - Stripe tokens only (no card data stored)
 * - All queries include user_id (IDOR prevention)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { stripe } from '@core/config/stripe';
import type { PaymentMethodRow } from '@core/types/db-rows';
import type { PaymentMethod } from '@core/types/subscription';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class PaymentMethodNotFoundError extends BizError {
  constructor(id: number) {
    super({
      code: 'PAYMENT_METHOD_NOT_FOUND',
      message: `Payment method not found: ${id}`,
      context: { id },
      userMessage: 'Payment method not found'
    });
  }
}

// ============================================================================
// PaymentMethodService
// ============================================================================

export class PaymentMethodService {
  constructor(private db: DatabaseService) {}

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get all payment methods for a user
   */
  async getUserPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    const result = await this.db.query<PaymentMethodRow>(
      'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRowToPaymentMethod(row));
  }

  /**
   * Get a single payment method by ID, scoped to user (IDOR prevention)
   */
  async getPaymentMethodById(id: number, userId: number): Promise<PaymentMethod> {
    const result = await this.db.query<PaymentMethodRow>(
      'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new PaymentMethodNotFoundError(id);
    }
    return this.mapRowToPaymentMethod(row);
  }

  /**
   * Get the default payment method for a user, or null if none
   */
  async getDefaultPaymentMethod(userId: number): Promise<PaymentMethod | null> {
    const result = await this.db.query<PaymentMethodRow>(
      'SELECT * FROM payment_methods WHERE user_id = ? AND is_default = 1 LIMIT 1',
      [userId]
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToPaymentMethod(row);
  }

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  /**
   * Add a payment method for a user.
   * Retrieves card metadata from Stripe API — stores only tokenized reference.
   */
  async addPaymentMethod(userId: number, stripePaymentMethodId: string): Promise<PaymentMethod> {
    // Retrieve payment method details from Stripe (metadata only)
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    const card = pm.type === 'card' ? pm.card : null;
    const bank = pm.type === 'us_bank_account' ? pm.us_bank_account : null;

    const brand = card?.brand ?? null;
    const lastFour = card?.last4 ?? bank?.last4 ?? null;
    const expMonth = card?.exp_month ?? null;
    const expYear = card?.exp_year ?? null;

    // Normalize type to DB enum — fallback unsupported types to 'card'
    const dbType: 'card' | 'us_bank_account' | 'paypal' | 'link' =
      (['card', 'us_bank_account', 'paypal', 'link'] as const).includes(pm.type as 'card' | 'us_bank_account' | 'paypal' | 'link')
        ? (pm.type as 'card' | 'us_bank_account' | 'paypal' | 'link')
        : 'card';

    // Determine if this should become the default (first method for user)
    const existing = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?',
      [userId]
    );
    const isFirst = bigIntToNumber(existing.rows[0]?.count) === 0;

    const insertResult = await this.db.query(
      `INSERT INTO payment_methods
        (user_id, stripe_payment_method_id, type, brand, last_four, exp_month, exp_year, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        stripePaymentMethodId,
        dbType,
        brand,
        lastFour,
        expMonth,
        expYear,
        isFirst ? 1 : 0
      ]
    );

    const newId = insertResult.insertId as number;
    return this.getPaymentMethodById(newId, userId);
  }

  /**
   * Remove a payment method. Detaches from Stripe and deletes local record.
   */
  async removePaymentMethod(id: number, userId: number): Promise<void> {
    const pm = await this.getPaymentMethodById(id, userId);

    // Detach from Stripe customer
    await stripe.paymentMethods.detach(pm.stripePaymentMethodId);

    // Delete local record
    await this.db.query(
      'DELETE FROM payment_methods WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    // If this was the default, promote the next one
    if (pm.isDefault) {
      const next = await this.db.query<PaymentMethodRow>(
        'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
        [userId]
      );
      if (next.rows[0]) {
        await this.db.query(
          'UPDATE payment_methods SET is_default = 1 WHERE id = ?',
          [next.rows[0].id]
        );
      }
    }
  }

  /**
   * Set a payment method as the user's default.
   * Clears is_default on all other methods first.
   */
  async setDefaultPaymentMethod(id: number, userId: number): Promise<void> {
    // Verify ownership
    await this.getPaymentMethodById(id, userId);

    // Clear all defaults for this user
    await this.db.query(
      'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?',
      [userId]
    );

    // Set the new default
    await this.db.query(
      'UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  // ==========================================================================
  // STRIPE SETUP
  // ==========================================================================

  /**
   * Create a Stripe SetupIntent so the client can collect card details.
   * Gets or creates a Stripe customer for this user first.
   */
  async createSetupIntent(userId: number): Promise<{ clientSecret: string }> {
    // Get user's stripe_customer_id
    const userResult = await this.db.query<{ stripe_customer_id: string | null; email: string; first_name: string | null; last_name: string | null }>(
      'SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw BizError.notFound('User', userId);
    }

    let customerId = user.stripe_customer_id;

    // If no Stripe customer yet, create one
    if (!customerId) {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined;
      const customer = await stripe.customers.create({
        email: user.email,
        name,
        metadata: { user_id: String(userId) }
      });
      customerId = customer.id;

      await this.db.query(
        'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
        [customerId, userId]
      );
    }

    // Create SetupIntent for Stripe Elements
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true }
    });

    if (!setupIntent.client_secret) {
      throw BizError.internalError('PaymentMethodService', new Error('Stripe SetupIntent did not return a client_secret'));
    }

    return { clientSecret: setupIntent.client_secret };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private mapRowToPaymentMethod(row: PaymentMethodRow): PaymentMethod {
    return {
      id: row.id,
      userId: row.user_id,
      stripePaymentMethodId: row.stripe_payment_method_id,
      type: row.type,
      brand: row.brand,
      lastFour: row.last_four,
      expMonth: row.exp_month,
      expYear: row.exp_year,
      isDefault: Boolean(row.is_default),
      billingName: row.billing_name,
      billingZip: row.billing_zip,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
