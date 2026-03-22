/**
 * ReferralService - Referral Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Service pattern: Feature-specific service in contacts feature
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/contacts/services/ContactService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import type {
  Referral,
  CreateReferralInput,
  ReferralStats,
  ReferralFilters,
  ReferralStatus,
  RewardStatus
} from '../types/referral';
import { REFERRAL_POINTS } from '../types/referral';

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class ReferralNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'REFERRAL_NOT_FOUND',
      message: `Referral not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested referral was not found'
    });
  }
}

export class DuplicateReferralError extends BizError {
  constructor(email: string) {
    super({
      code: 'DUPLICATE_REFERRAL',
      message: `Referral already exists for email: ${email}`,
      context: { email },
      userMessage: 'A referral has already been sent to this email address'
    });
  }
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ReferralService {
  private db: DatabaseService;
  private baseUrl: string;

  constructor(db: DatabaseService) {
    this.db = db;
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  }

  // ==========================================================================
  // REFERRAL CRUD
  // ==========================================================================

  /**
   * Create a new referral
   */
  async createReferral(
    userId: number,
    input: CreateReferralInput
  ): Promise<Referral> {
    // Check for existing referral to same email by same user
    const existing = await this.findByEmail(userId, input.referred_email);
    if (existing) {
      throw new DuplicateReferralError(input.referred_email);
    }

    // Generate unique referral code
    const referralCode = await this.generateUniqueCode();
    const referralLink = `${this.baseUrl}/join?ref=${referralCode}`;

    const query = `
      INSERT INTO user_referrals (
        referrer_user_id,
        contact_id,
        referred_email,
        referred_phone,
        referred_name,
        referral_code,
        referral_message,
        referral_link,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const params = [
      userId,
      input.contact_id || null,
      input.referred_email,
      input.referred_phone || null,
      input.referred_name || null,
      referralCode,
      input.referral_message || null,
      referralLink
    ];

    const result = await this.db.query(query, params);
    const insertId = bigIntToNumber(result.insertId);

    return this.getById(insertId);
  }

  /**
   * Get referral by ID
   */
  async getById(referralId: number): Promise<Referral> {
    const query = `
      SELECT * FROM user_referrals WHERE id = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [referralId]);
    const rows = result.rows || [];

    if (rows.length === 0) {
      throw new ReferralNotFoundError(referralId);
    }

    const row = rows[0];
    if (!row) {
      throw new ReferralNotFoundError(referralId);
    }

    return this.mapRowToReferral(row);
  }

  /**
   * Get all referrals for a user
   */
  async getByUserId(
    userId: number,
    filters?: ReferralFilters
  ): Promise<Referral[]> {
    let query = `
      SELECT * FROM user_referrals
      WHERE referrer_user_id = ?
    `;
    const params: (string | number | ReferralStatus | RewardStatus | null | undefined)[] = [userId];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.reward_status) {
      query += ' AND reward_status = ?';
      params.push(filters.reward_status);
    }

    if (filters?.from_date) {
      query += ' AND created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters?.to_date) {
      query += ' AND created_at <= ?';
      params.push(filters.to_date);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    return rows.map(row => this.mapRowToReferral(row));
  }

  /**
   * Update referral status
   */
  async updateStatus(
    referralId: number,
    newStatus: ReferralStatus
  ): Promise<Referral> {
    const timestampField = this.getTimestampField(newStatus);
    const pointsToAdd = this.getPointsForStatus(newStatus);

    let query = `
      UPDATE user_referrals
      SET status = ?, updated_at = NOW()
    `;
    const params: (string | number)[] = [newStatus];

    if (timestampField) {
      query += `, ${timestampField} = NOW()`;
    }

    if (pointsToAdd > 0) {
      query += `, reward_points = reward_points + ?`;
      params.push(pointsToAdd);
    }

    query += ' WHERE id = ?';
    params.push(referralId);

    await this.db.query(query, params);

    return this.getById(referralId);
  }

  /**
   * Mark referral as sent
   */
  async markAsSent(referralId: number): Promise<Referral> {
    return this.updateStatus(referralId, 'sent');
  }

  /**
   * Record when referral link is viewed
   */
  async recordView(referralCode: string): Promise<Referral | null> {
    const referral = await this.findByCode(referralCode);
    if (!referral) return null;

    // Only update if not already viewed or beyond
    if (referral.status === 'pending' || referral.status === 'sent') {
      return this.updateStatus(referral.id, 'viewed');
    }

    return referral;
  }

  /**
   * Record when referred user registers
   */
  async recordRegistration(
    referralCode: string,
    newUserId: number
  ): Promise<Referral | null> {
    const referral = await this.findByCode(referralCode);
    if (!referral) return null;

    const query = `
      UPDATE user_referrals
      SET status = 'registered',
          registered_at = NOW(),
          registered_user_id = ?,
          reward_points = reward_points + ?,
          updated_at = NOW()
      WHERE id = ?
    `;

    await this.db.query(query, [
      newUserId,
      REFERRAL_POINTS.registered,
      referral.id
    ]);

    return this.getById(referral.id);
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get referral statistics for a user
   */
  async getStats(userId: number): Promise<ReferralStats> {
    const query = `
      SELECT
        COUNT(*) as total_sent,
        SUM(CASE WHEN status IN ('registered', 'connected') THEN 1 ELSE 0 END) as total_registered,
        SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) as total_connected,
        SUM(reward_points) as total_points_earned,
        SUM(CASE WHEN status IN ('pending', 'sent', 'viewed') THEN 1 ELSE 0 END) as pending_referrals
      FROM user_referrals
      WHERE referrer_user_id = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const row = result.rows?.[0] || {};

    const totalSent = bigIntToNumber(row.total_sent) || 0;
    const totalRegistered = bigIntToNumber(row.total_registered) || 0;

    return {
      total_sent: totalSent,
      total_registered: totalRegistered,
      total_connected: bigIntToNumber(row.total_connected) || 0,
      total_points_earned: bigIntToNumber(row.total_points_earned) || 0,
      pending_referrals: bigIntToNumber(row.pending_referrals) || 0,
      conversion_rate: totalSent > 0 ? (totalRegistered / totalSent) * 100 : 0
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Find referral by email for a specific user
   */
  private async findByEmail(
    userId: number,
    email: string
  ): Promise<Referral | null> {
    const query = `
      SELECT * FROM user_referrals
      WHERE referrer_user_id = ? AND referred_email = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, email]);
    const rows = result.rows || [];

    const row = rows[0];
    return row ? this.mapRowToReferral(row) : null;
  }

  /**
   * Find referral by code
   */
  private async findByCode(code: string): Promise<Referral | null> {
    const query = `
      SELECT * FROM user_referrals WHERE referral_code = ?
    `;

    const result = await this.db.query<RowDataPacket>(query, [code]);
    const rows = result.rows || [];

    const row = rows[0];
    return row ? this.mapRowToReferral(row) : null;
  }

  /**
   * Generate unique referral code
   */
  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomPart = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join('');

      code = `BIZ-${randomPart}`;

      const existing = await this.findByCode(code);
      if (!existing) break;

      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new BizError({
        code: 'CODE_GENERATION_FAILED',
        message: 'Failed to generate unique referral code',
        userMessage: 'Please try again'
      });
    }

    return code;
  }

  /**
   * Get timestamp field for status
   */
  private getTimestampField(status: ReferralStatus): string | null {
    const map: Record<ReferralStatus, string | null> = {
      pending: null,
      sent: 'sent_at',
      viewed: 'viewed_at',
      registered: 'registered_at',
      connected: null
    };
    return map[status];
  }

  /**
   * Get points for status transition
   */
  private getPointsForStatus(status: ReferralStatus): number {
    const map: Record<ReferralStatus, number> = {
      pending: 0,
      sent: REFERRAL_POINTS.sent,
      viewed: 0,
      registered: REFERRAL_POINTS.registered,
      connected: REFERRAL_POINTS.connected
    };
    return map[status];
  }

  /**
   * Map database row to Referral interface
   */
  private mapRowToReferral(row: RowDataPacket): Referral {
    return {
      id: row.id,
      referrer_user_id: row.referrer_user_id,
      contact_id: row.contact_id,
      referred_email: row.referred_email,
      referred_phone: row.referred_phone,
      referred_name: row.referred_name,
      referral_code: row.referral_code,
      referral_message: row.referral_message,
      referral_link: row.referral_link,
      status: row.status,
      reward_status: row.reward_status,
      reward_points: row.reward_points,
      sent_at: row.sent_at ? new Date(row.sent_at) : null,
      viewed_at: row.viewed_at ? new Date(row.viewed_at) : null,
      registered_at: row.registered_at ? new Date(row.registered_at) : null,
      registered_user_id: row.registered_user_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
