/**
 * CampaignBankService - Campaign credit balance tracking per listing
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 * @tier ENTERPRISE
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary (no direct DB in routes)
 * - BizError for all error handling
 * - bigIntToNumber for all COUNT(*) results
 * - DECIMAL columns returned as strings from mariadb → parseFloat in mapRow
 * - IDOR prevention via listing ownership validation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { BillingService } from '@core/services/BillingService';
import type { CampaignBankRow } from '@core/types/db-rows';
import type { CampaignBank, CampaignBankDepositInput } from '@core/types/subscription';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class InsufficientCampaignBalanceError extends BizError {
  constructor(available: number, requested: number) {
    super({
      code: 'INSUFFICIENT_CAMPAIGN_BALANCE',
      message: `Insufficient campaign balance: ${available} available, ${requested} requested`,
      context: { available, requested },
      userMessage: 'Insufficient campaign bank balance for this operation'
    });
  }
}

// ============================================================================
// CampaignBankService
// ============================================================================

export class CampaignBankService {
  constructor(private db: DatabaseService) {}

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private mapRowToCampaignBank(row: CampaignBankRow): CampaignBank {
    return {
      id: row.id,
      userId: row.user_id,
      listingId: row.listing_id,
      balance: parseFloat(row.balance),
      totalDeposited: parseFloat(row.total_deposited),
      totalSpent: parseFloat(row.total_spent),
      lastDepositAt: row.last_deposit_at ? new Date(row.last_deposit_at) : null,
      lastSpendAt: row.last_spend_at ? new Date(row.last_spend_at) : null,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async validateListingOwnership(userId: number, listingId: number): Promise<void> {
    const result = await this.db.query<{ user_id: number }>(
      'SELECT user_id FROM listings WHERE id = ?',
      [listingId]
    );
    if (!result.rows[0] || result.rows[0].user_id !== userId) {
      throw BizError.forbidden('You do not own this listing');
    }
  }

  // ==========================================================================
  // CORE OPERATIONS
  // ==========================================================================

  /**
   * Get an existing campaign bank for a listing, or create one if it doesn't exist.
   */
  async getOrCreateBank(userId: number, listingId: number): Promise<CampaignBank> {
    const existing = await this.db.query<CampaignBankRow>(
      'SELECT * FROM campaign_banks WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (existing.rows[0]) {
      return this.mapRowToCampaignBank(existing.rows[0]);
    }

    // Insert new bank record
    await this.db.query(
      `INSERT INTO campaign_banks (user_id, listing_id, balance, total_deposited, total_spent, status)
       VALUES (?, ?, 0.00, 0.00, 0.00, 'active')`,
      [userId, listingId]
    );

    const created = await this.db.query<CampaignBankRow>(
      'SELECT * FROM campaign_banks WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (!created.rows[0]) {
      throw new BizError({
        code: 'CAMPAIGN_BANK_CREATE_FAILED',
        message: 'Failed to create campaign bank',
        userMessage: 'Failed to create campaign bank'
      });
    }

    return this.mapRowToCampaignBank(created.rows[0]);
  }

  /**
   * Deposit funds into a listing's campaign bank.
   * Validates listing ownership, updates balances, and records a billing transaction.
   */
  async deposit(userId: number, input: CampaignBankDepositInput): Promise<CampaignBank> {
    await this.validateListingOwnership(userId, input.listingId);

    if (input.amount <= 0) {
      throw BizError.validation('amount', input.amount, 'Deposit amount must be greater than 0');
    }

    await this.db.query(
      `UPDATE campaign_banks
       SET
         balance = balance + ?,
         total_deposited = total_deposited + ?,
         last_deposit_at = NOW(),
         status = 'active'
       WHERE user_id = ? AND listing_id = ?`,
      [input.amount, input.amount, userId, input.listingId]
    );

    // Ensure bank exists (creates if not yet present)
    const bank = await this.getOrCreateBank(userId, input.listingId);

    // Record billing transaction
    const billingService = new BillingService(this.db);
    await billingService.recordTransaction({
      userId,
      listingId: input.listingId,
      transactionType: 'campaign_bank_deposit',
      amount: input.amount,
      description: input.description ?? 'Campaign bank deposit'
    });

    return bank;
  }

  /**
   * Spend funds from a listing's campaign bank.
   * Throws InsufficientCampaignBalanceError if balance is insufficient.
   */
  async spend(
    userId: number,
    listingId: number,
    amount: number,
    description?: string
  ): Promise<CampaignBank> {
    const bank = await this.getOrCreateBank(userId, listingId);

    if (bank.balance < amount) {
      throw new InsufficientCampaignBalanceError(bank.balance, amount);
    }

    const newBalance = bank.balance - amount;
    const newStatus = newBalance === 0 ? 'depleted' : bank.status;

    await this.db.query(
      `UPDATE campaign_banks
       SET
         balance = balance - ?,
         total_spent = total_spent + ?,
         last_spend_at = NOW(),
         status = ?
       WHERE user_id = ? AND listing_id = ?`,
      [amount, amount, newStatus, userId, listingId]
    );

    // Record billing transaction
    const billingService = new BillingService(this.db);
    await billingService.recordTransaction({
      userId,
      listingId,
      transactionType: 'campaign_bank_spend',
      amount,
      description: description ?? 'Campaign bank spend'
    });

    const updated = await this.db.query<CampaignBankRow>(
      'SELECT * FROM campaign_banks WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );

    if (!updated.rows[0]) {
      throw new BizError({
        code: 'CAMPAIGN_BANK_NOT_FOUND',
        message: 'Campaign bank not found after spend operation',
        userMessage: 'Campaign bank not found'
      });
    }

    const updatedBank = this.mapRowToCampaignBank(updated.rows[0]);

    // Non-blocking: check balance thresholds and notify
    try {
      const { NotificationService } = await import('@core/services/NotificationService');
      const notificationService = new NotificationService(this.db);

      if (updatedBank.balance <= 0) {
        await notificationService.dispatch({
          type: 'billing.campaign_bank_depleted' as import('@core/services/notification/types').NotificationEventType,
          recipientId: userId,
          title: 'Campaign Balance Depleted',
          message: 'Your campaign bank balance has been fully used. Add funds to continue running campaigns.',
          actionUrl: '/dashboard/account/campaign-bank',
          priority: 'high'
        });
      } else if (updatedBank.totalDeposited > 0 && updatedBank.balance <= updatedBank.totalDeposited * 0.25) {
        await notificationService.dispatch({
          type: 'billing.campaign_bank_low' as import('@core/services/notification/types').NotificationEventType,
          recipientId: userId,
          title: 'Campaign Balance Running Low',
          message: `Your campaign bank balance is $${updatedBank.balance.toFixed(2)} — only ${Math.round((updatedBank.balance / updatedBank.totalDeposited) * 100)}% remaining.`,
          actionUrl: '/dashboard/account/campaign-bank',
          priority: 'normal'
        });
      }
    } catch { /* Non-blocking */ }

    return updatedBank;
  }

  /**
   * Get the campaign bank balance for a specific listing.
   * Creates the bank record if it doesn't exist.
   */
  async getBalance(userId: number, listingId: number): Promise<CampaignBank> {
    return this.getOrCreateBank(userId, listingId);
  }

  /**
   * Get all campaign banks for a user, joined with listing names.
   */
  async getBanksForUser(userId: number): Promise<CampaignBank[]> {
    const result = await this.db.query<CampaignBankRow>(
      `SELECT cb.*
       FROM campaign_banks cb
       JOIN listings l ON cb.listing_id = l.id
       WHERE cb.user_id = ?
       ORDER BY cb.updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRowToCampaignBank(row));
  }

  /**
   * Admin: Paginated list of all campaign banks with user and listing info.
   */
  async getAdminBankList(options: {
    page?: number;
    pageSize?: number;
    userId?: number;
    status?: string;
  }): Promise<{ items: AdminCampaignBankItem[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];

    if (options.userId) {
      conditions.push('cb.user_id = ?');
      params.push(options.userId);
    }

    if (options.status) {
      conditions.push('cb.status = ?');
      params.push(options.status);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.db.query<{ count: bigint | number }>(
      `SELECT COUNT(*) as count
       FROM campaign_banks cb
       JOIN users u ON cb.user_id = u.id
       JOIN listings l ON cb.listing_id = l.id
       WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

    const dataResult = await this.db.query<AdminCampaignBankRow>(
      `SELECT
         cb.id,
         cb.user_id,
         cb.listing_id,
         cb.balance,
         cb.total_deposited,
         cb.total_spent,
         cb.last_deposit_at,
         cb.last_spend_at,
         cb.status,
         cb.created_at,
         cb.updated_at,
         u.email as user_email,
         u.display_name as user_name,
         l.name as listing_name
       FROM campaign_banks cb
       JOIN users u ON cb.user_id = u.id
       JOIN listings l ON cb.listing_id = l.id
       WHERE ${whereClause}
       ORDER BY cb.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const items = dataResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      listingId: row.listing_id,
      balance: parseFloat(String(row.balance)),
      totalDeposited: parseFloat(String(row.total_deposited)),
      totalSpent: parseFloat(String(row.total_spent)),
      lastDepositAt: row.last_deposit_at ? new Date(row.last_deposit_at) : null,
      lastSpendAt: row.last_spend_at ? new Date(row.last_spend_at) : null,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      userEmail: row.user_email,
      userName: row.user_name,
      listingName: row.listing_name
    }));

    return { items, total };
  }
}

// ============================================================================
// Admin-specific types (internal to service)
// ============================================================================

interface AdminCampaignBankRow extends CampaignBankRow {
  user_email: string;
  user_name: string | null;
  listing_name: string;
}

export interface AdminCampaignBankItem {
  id: number;
  userId: number;
  listingId: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt: Date | null;
  lastSpendAt: Date | null;
  status: 'active' | 'frozen' | 'depleted';
  createdAt: Date;
  updatedAt: Date;
  userEmail: string;
  userName: string | null;
  listingName: string;
}
