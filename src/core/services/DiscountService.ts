/**
 * DiscountService - Discount Code Management Service
 *
 * @tier STANDARD
 * @complexity Standard discount/coupon management
 * @methods 12 methods (create, validate, apply, bulk generation)
 * @authority Build Map v2.1 ENHANCED
 * @database discount_codes, discount_usage tables
 *
 * Manages discount codes and coupons including:
 * - Discount code CRUD operations
 * - Code validation and application
 * - Usage tracking and limits
 * - Bulk coupon generation
 * - Usage statistics
 * - Expiration management
 *
 * @see docs/buildSpecs/incorporationV_old/phases/PHASE_5.3_BRAIN_PLAN.md
 */

import { DatabaseService, getDatabaseService } from './DatabaseService';
import { DbResult } from '@core/types/db';
import { AllRowTypes } from '@core/types/db-rows';
import { bigIntToNumber } from '@core/utils/bigint';

export type DiscountType = 'percentage' | 'fixed' | 'free_tier_upgrade';
export type DiscountAppliesTo = 'all' | 'essentials' | 'plus' | 'preferred' | 'premium';

// Internal interface for database row mapping (schema may differ from DiscountCodeRow)
interface DiscountCodeRowData {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to?: string;
  max_uses?: number | null;
  current_uses?: number;
  max_uses_per_user?: number;
  valid_from: Date | string;
  valid_until?: Date | string | null;
  is_active: number | boolean;
  description?: string | null;
  created_by: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DiscountCode {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: DiscountAppliesTo;
  max_uses?: number;
  current_uses: number;
  max_uses_per_user: number;
  valid_from: Date;
  valid_until?: Date;
  is_active: boolean;
  description?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDiscountInput {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  applies_to?: DiscountAppliesTo;
  max_uses?: number;
  max_uses_per_user?: number;
  valid_from?: Date;
  valid_until?: Date;
  description?: string;
  created_by: number;
}

export interface DiscountFilter {
  discount_type?: DiscountType;
  applies_to?: DiscountAppliesTo;
  is_active?: boolean;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface DiscountUsage {
  id: number;
  discount_id: number;
  user_id: number;
  subscription_id?: number;
  discount_amount: number;
  used_at: Date;
}

export interface DiscountUsageStatistics {
  discountId: number;
  code: string;
  totalUses: number;
  uniqueUsers: number;
  totalDiscountAmount: number;
  averageDiscountAmount: number;
  remainingUses?: number;
  usageRate: number; // Percentage of max_uses consumed
}

export interface ValidationResult {
  valid: boolean;
  discount?: DiscountCode;
  reason?: string;
}

export class DiscountService {
  private db: DatabaseService;

  constructor(db?: DatabaseService) {
    this.db = db || getDatabaseService();
  }

  /**
   * Get all discount codes with optional filters and pagination
   *
   * @param filters - Optional filtering criteria
   * @param pagination - Pagination options
   * @returns Array of discount codes
   */
  async getAllDiscounts(filters?: DiscountFilter, pagination?: Pagination): Promise<DiscountCode[]> {
    let query = 'SELECT * FROM discount_codes WHERE 1=1';
    const params: (string | number | boolean)[] = [];

    if (filters) {
      if (filters.discount_type) {
        query += ' AND discount_type = ?';
        params.push(filters.discount_type);
      }
      if (filters.applies_to) {
        query += ' AND applies_to = ?';
        params.push(filters.applies_to);
      }
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }
    }

    query += ' ORDER BY created_at DESC';

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const result: DbResult<AllRowTypes> = await this.db.query(query, params);

    return result.rows.map((row) => this.mapRowToDiscountCode(row as unknown as DiscountCodeRowData));
  }

  /**
   * Get a single discount code by ID
   *
   * @param id - Discount code ID
   * @returns Discount code or null if not found
   */
  async getDiscountById(id: number): Promise<DiscountCode | null> {
    const result = await this.db.query(
      'SELECT * FROM discount_codes WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) return null;

    return this.mapRowToDiscountCode(result.rows[0] as unknown as DiscountCodeRowData);
  }

  /**
   * Create a new discount code
   *
   * @param data - Discount code creation data
   * @returns Created discount code ID
   */
  async createDiscount(data: CreateDiscountInput): Promise<number> {
    const result = await this.db.query(
      `INSERT INTO discount_codes (
        code, discount_type, discount_value, applies_to, max_uses,
        max_uses_per_user, valid_from, valid_until, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code.toUpperCase(), // Store codes in uppercase
        data.discount_type,
        data.discount_value,
        data.applies_to || 'all',
        data.max_uses || null,
        data.max_uses_per_user || 1,
        data.valid_from || new Date(),
        data.valid_until || null,
        data.description || null,
        data.created_by
      ]
    );

    return result.insertId || 0;
  }

  /**
   * Update an existing discount code
   *
   * @param id - Discount code ID
   * @param updates - Partial discount data to update
   * @returns Number of affected rows
   */
  async updateDiscount(id: number, updates: Partial<CreateDiscountInput>): Promise<number> {
    const fields: string[] = [];
    const params: (string | number | Date | undefined)[] = [];

    if (updates.code !== undefined) {
      fields.push('code = ?');
      params.push(updates.code.toUpperCase());
    }
    if (updates.discount_type !== undefined) {
      fields.push('discount_type = ?');
      params.push(updates.discount_type);
    }
    if (updates.discount_value !== undefined) {
      fields.push('discount_value = ?');
      params.push(updates.discount_value);
    }
    if (updates.applies_to !== undefined) {
      fields.push('applies_to = ?');
      params.push(updates.applies_to);
    }
    if (updates.max_uses !== undefined) {
      fields.push('max_uses = ?');
      params.push(updates.max_uses);
    }
    if (updates.max_uses_per_user !== undefined) {
      fields.push('max_uses_per_user = ?');
      params.push(updates.max_uses_per_user);
    }
    if (updates.valid_from !== undefined) {
      fields.push('valid_from = ?');
      params.push(updates.valid_from);
    }
    if (updates.valid_until !== undefined) {
      fields.push('valid_until = ?');
      params.push(updates.valid_until);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (fields.length === 0) return 0;

    params.push(id);

    const result = await this.db.query(
      `UPDATE discount_codes SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return result.rowCount;
  }

  /**
   * Delete a discount code
   *
   * @param id - Discount code ID
   * @returns Number of affected rows
   */
  async deleteDiscount(id: number): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM discount_codes WHERE id = ?',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Validate a discount code
   *
   * @param code - Discount code to validate
   * @param userId - User ID attempting to use the code
   * @param tier - User's membership tier
   * @returns Validation result with discount details if valid
   */
  async validateDiscountCode(code: string, userId?: number, tier?: string): Promise<ValidationResult> {
    const result = await this.db.query(
      'SELECT * FROM discount_codes WHERE code = ? AND is_active = TRUE',
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: 'Invalid or inactive discount code' };
    }

    const discount = this.mapRowToDiscountCode(result.rows[0] as unknown as DiscountCodeRowData);
    const now = new Date();

    // Check validity period
    if (now < new Date(discount.valid_from)) {
      return { valid: false, reason: 'Discount code not yet valid' };
    }

    if (discount.valid_until && now > new Date(discount.valid_until)) {
      return { valid: false, reason: 'Discount code has expired' };
    }

    // Check max uses
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return { valid: false, reason: 'Discount code has reached maximum usage limit' };
    }

    // Check tier eligibility
    if (tier && discount.applies_to !== 'all' && discount.applies_to !== tier) {
      return { valid: false, reason: `Discount code only applies to ${discount.applies_to} tier` };
    }

    // Check per-user usage limit if userId provided
    if (userId) {
      const usageResult = await this.db.query(
        'SELECT COUNT(*) as usageCount FROM discount_usage WHERE discount_id = ? AND user_id = ?',
        [discount.id, userId]
      );

      if (bigIntToNumber((usageResult.rows[0] as { usageCount: bigint | number }).usageCount) >= discount.max_uses_per_user) {
        return { valid: false, reason: 'You have already used this discount code the maximum number of times' };
      }
    }

    return { valid: true, discount };
  }

  /**
   * Apply a discount code (record usage)
   *
   * @param code - Discount code
   * @param userId - User ID applying the discount
   * @param amount - Original amount before discount
   * @param subscriptionId - Optional subscription ID if used for subscription
   * @returns Applied discount amount
   */
  async applyDiscount(code: string, userId: number, amount: number, subscriptionId?: number): Promise<number> {
    // Validate first
    const validation = await this.validateDiscountCode(code, userId);
    if (!validation.valid || !validation.discount) {
      throw new Error(validation.reason || 'Invalid discount code');
    }

    const discount = validation.discount;
    let discountAmount = 0;

    // Calculate discount amount
    if (discount.discount_type === 'percentage') {
      discountAmount = (amount * discount.discount_value) / 100;
    } else if (discount.discount_type === 'fixed') {
      discountAmount = Math.min(discount.discount_value, amount);
    }

    // Record usage
    await this.db.query(
      `INSERT INTO discount_usage (discount_id, user_id, subscription_id, discount_amount)
       VALUES (?, ?, ?, ?)`,
      [discount.id, userId, subscriptionId || null, discountAmount]
    );

    // Increment current_uses
    await this.db.query(
      'UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = ?',
      [discount.id]
    );

    return discountAmount;
  }

  /**
   * Get discount usage statistics
   *
   * @param discountId - Discount code ID
   * @returns Usage statistics
   */
  async getDiscountUsageStatistics(discountId: number): Promise<DiscountUsageStatistics | null> {
    const discountResult = await this.db.query(
      'SELECT * FROM discount_codes WHERE id = ?',
      [discountId]
    );

    if (discountResult.rows.length === 0) return null;

    const discount = this.mapRowToDiscountCode(discountResult.rows[0] as unknown as DiscountCodeRowData);

    const usageResult = await this.db.query(
      `SELECT
        COUNT(*) as totalUses,
        COUNT(DISTINCT user_id) as uniqueUsers,
        SUM(discount_amount) as totalDiscountAmount,
        AVG(discount_amount) as averageDiscountAmount
       FROM discount_usage
       WHERE discount_id = ?`,
      [discountId]
    );

    const usage = usageResult.rows[0] as {
      totalUses?: bigint | number;
      uniqueUsers?: bigint | number;
      totalDiscountAmount?: number;
      averageDiscountAmount?: number;
    };
    const remainingUses = discount.max_uses ? discount.max_uses - discount.current_uses : undefined;
    const usageRate = discount.max_uses ? (discount.current_uses / discount.max_uses) * 100 : 0;

    return {
      discountId: discount.id,
      code: discount.code,
      totalUses: bigIntToNumber(usage.totalUses),
      uniqueUsers: bigIntToNumber(usage.uniqueUsers),
      totalDiscountAmount: usage.totalDiscountAmount || 0,
      averageDiscountAmount: usage.averageDiscountAmount || 0,
      remainingUses,
      usageRate: Number(usageRate.toFixed(2))
    };
  }

  /**
   * Generate bulk discount coupons
   *
   * @param baseData - Base discount data (same settings for all codes)
   * @param count - Number of codes to generate
   * @returns Array of generated discount code IDs
   */
  async generateBulkCoupons(baseData: CreateDiscountInput, count: number): Promise<number[]> {
    const generatedIds: number[] = [];

    for (let i = 0; i < count; i++) {
      // Generate unique code with random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const uniqueCode = `${baseData.code}-${randomSuffix}`;

      try {
        const id = await this.createDiscount({
          ...baseData,
          code: uniqueCode
        });
        generatedIds.push(id);
      } catch (error) {
        // Skip duplicates and continue

      }
    }

    return generatedIds;
  }

  /**
   * Expire a discount code (set is_active to false)
   *
   * @param id - Discount code ID
   * @returns Number of affected rows
   */
  async expireDiscount(id: number): Promise<number> {
    const result = await this.db.query(
      'UPDATE discount_codes SET is_active = FALSE WHERE id = ?',
      [id]
    );

    return result.rowCount;
  }

  /**
   * Get all discount usages
   *
   * @param discountId - Optional filter by discount ID
   * @param userId - Optional filter by user ID
   * @returns Array of discount usages
   */
  async getDiscountUsages(discountId?: number, userId?: number): Promise<DiscountUsage[]> {
    let query = 'SELECT * FROM discount_usage WHERE 1=1';
    const params: number[] = [];

    if (discountId) {
      query += ' AND discount_id = ?';
      params.push(discountId);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY used_at DESC';

    const result: DbResult<AllRowTypes> = await this.db.query(query, params);

    interface DiscountUsageRow {
      id: number;
      discount_id: number;
      user_id: number;
      subscription_id: number | null;
      discount_amount: number;
      used_at: Date | string;
    }

    return result.rows.map((row) => {
      const usageRow = row as unknown as DiscountUsageRow;
      return {
        id: usageRow.id,
        discount_id: usageRow.discount_id,
        user_id: usageRow.user_id,
        subscription_id: usageRow.subscription_id || undefined,
        discount_amount: usageRow.discount_amount,
        used_at: new Date(usageRow.used_at)
      };
    });
  }

  /**
   * Map database row to DiscountCode object
   *
   * @param row - Database row
   * @returns DiscountCode object
   */
  private mapRowToDiscountCode(row: DiscountCodeRowData): DiscountCode {
    return {
      id: row.id,
      code: row.code,
      discount_type: row.discount_type as DiscountType,
      discount_value: row.discount_value,
      applies_to: (row.applies_to as DiscountAppliesTo) || 'all',
      max_uses: row.max_uses || undefined,
      current_uses: row.current_uses || 0,
      max_uses_per_user: row.max_uses_per_user || 1,
      valid_from: new Date(row.valid_from),
      valid_until: row.valid_until ? new Date(row.valid_until) : undefined,
      is_active: Boolean(row.is_active),
      description: row.description || undefined,
      created_by: row.created_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
