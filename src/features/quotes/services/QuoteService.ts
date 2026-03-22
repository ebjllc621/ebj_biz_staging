/**
 * QuoteService - Quote Request and Bid Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 * @reference src/features/connections/services/ConnectionGroupService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { NotificationService } from '@core/services/NotificationService';
import { safeJsonParse } from '@core/utils/bigint';
import type {
  Quote,
  QuoteRequest,
  QuoteResponse,
  QuoteMessage,
  QuoteAttachment,
  CreateQuoteInput,
  UpdateQuoteInput,
  CreateQuoteRequestInput,
  CreateQuoteResponseInput,
  UpdateQuoteResponseInput,
  GetQuotesOptions,
  GetQuoteResponsesOptions,
  QuoteDashboardSummary
} from '../types';

// ============================================================================
// Custom Errors
// ============================================================================

export class QuoteError extends BizError {
  constructor(message: string) {
    super({ code: 'QUOTE_ERROR', message, userMessage: message });
    this.name = 'QuoteError';
  }
}

export class QuoteNotFoundError extends BizError {
  constructor(message = 'Quote not found') {
    super({ code: 'QUOTE_NOT_FOUND', message, userMessage: message });
    this.name = 'QuoteNotFoundError';
  }
}

export class UnauthorizedQuoteAccessError extends BizError {
  constructor(message = 'Not authorized to access this quote') {
    super({ code: 'UNAUTHORIZED_QUOTE_ACCESS', message, userMessage: message });
    this.name = 'UnauthorizedQuoteAccessError';
  }
}

// ============================================================================
// Row types for database results
// ============================================================================

interface QuoteRow {
  id: number;
  requester_user_id: number | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  title: string;
  description: string;
  service_category: string | null;
  timeline: string;
  budget_min: number | null;
  budget_max: number | null;
  preferred_start_date: Date | null;
  location_address: string | null;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  status: string;
  visibility: string;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  request_count?: bigint | number;
  response_count?: bigint | number;
}

interface QuoteRequestRow {
  id: number;
  quote_id: number;
  target_type: string;
  target_listing_id: number | null;
  target_group_id: number | null;
  target_user_id: number | null;
  invited_at: Date;
  viewed_at: Date | null;
  status: string;
  target_name?: string;
  target_avatar_url?: string | null;
}

interface QuoteResponseRow {
  id: number;
  quote_id: number;
  quote_request_id: number | null;
  responder_user_id: number;
  responder_listing_id: number | null;
  bid_amount: number | null;
  bid_description: string;
  estimated_duration: string | null;
  valid_until: Date | null;
  attachments: string | QuoteAttachment[] | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  responder_name?: string;
  responder_avatar_url?: string | null;
  listing_name?: string | null;
}

interface QuoteMessageRow {
  id: number;
  quote_id: number;
  quote_response_id: number | null;
  sender_user_id: number;
  content: string;
  created_at: Date;
  sender_name?: string;
  sender_avatar_url?: string | null;
}

interface CountRow {
  total: bigint | number;
}

// ============================================================================
// Mappers
// ============================================================================

function mapQuoteRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    requesterUserId: row.requester_user_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email,
    requesterPhone: row.requester_phone,
    title: row.title,
    description: row.description,
    serviceCategory: row.service_category,
    timeline: row.timeline as Quote['timeline'],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    preferredStartDate: row.preferred_start_date,
    locationAddress: row.location_address,
    locationCity: row.location_city,
    locationState: row.location_state,
    locationZip: row.location_zip,
    status: row.status as Quote['status'],
    visibility: row.visibility as Quote['visibility'],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requestCount: row.request_count !== undefined ? bigIntToNumber(row.request_count as bigint | number) : undefined,
    responseCount: row.response_count !== undefined ? bigIntToNumber(row.response_count as bigint | number) : undefined
  };
}

function mapQuoteRequestRow(row: QuoteRequestRow): QuoteRequest {
  return {
    id: row.id,
    quoteId: row.quote_id,
    targetType: row.target_type as QuoteRequest['targetType'],
    targetListingId: row.target_listing_id,
    targetGroupId: row.target_group_id,
    targetUserId: row.target_user_id,
    invitedAt: row.invited_at,
    viewedAt: row.viewed_at,
    status: row.status as QuoteRequest['status'],
    targetName: row.target_name,
    targetAvatarUrl: row.target_avatar_url
  };
}

function mapQuoteResponseRow(row: QuoteResponseRow): QuoteResponse {
  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteRequestId: row.quote_request_id,
    responderUserId: row.responder_user_id,
    responderListingId: row.responder_listing_id,
    bidAmount: row.bid_amount,
    bidDescription: row.bid_description,
    estimatedDuration: row.estimated_duration,
    validUntil: row.valid_until,
    attachments: row.attachments ? safeJsonParse<QuoteAttachment[]>(row.attachments as string | QuoteAttachment[], []) : null,
    status: row.status as QuoteResponse['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responderName: row.responder_name,
    responderAvatarUrl: row.responder_avatar_url,
    listingName: row.listing_name
  };
}

function mapQuoteMessageRow(row: QuoteMessageRow): QuoteMessage {
  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteResponseId: row.quote_response_id,
    senderUserId: row.sender_user_id,
    content: row.content,
    createdAt: row.created_at,
    senderName: row.sender_name,
    senderAvatarUrl: row.sender_avatar_url
  };
}

// ============================================================================
// QuoteService Implementation
// ============================================================================

export class QuoteService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.notificationService = new NotificationService(db);
  }

  // ==========================================================================
  // 1. createQuote
  // ==========================================================================

  /**
   * Create a new quote request
   */
  async createQuote(userId: number, input: CreateQuoteInput): Promise<Quote> {
    const {
      title,
      description,
      serviceCategory = null,
      timeline = 'flexible',
      budgetMin = null,
      budgetMax = null,
      preferredStartDate = null,
      locationAddress = null,
      locationCity = null,
      locationState = null,
      locationZip = null,
      visibility = 'direct',
      expiresAt = null
    } = input;

    // Get user info for requester fields
    const userResult = await this.db.query<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      throw BizError.notFound('User', userId);
    }

    const user = userResult.rows[0]!;

    const result = await this.db.query(
      `INSERT INTO quotes (
        requester_user_id, requester_name, requester_email,
        title, description, service_category,
        timeline, budget_min, budget_max, preferred_start_date,
        location_address, location_city, location_state, location_zip,
        status, visibility, expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())`,
      [
        userId,
        user.name,
        user.email,
        title,
        description,
        serviceCategory,
        timeline,
        budgetMin,
        budgetMax,
        preferredStartDate,
        locationAddress,
        locationCity,
        locationState,
        locationZip,
        visibility,
        expiresAt
      ]
    );

    const quoteId = result.insertId as number;
    return this.getQuote(quoteId, userId);
  }

  // ==========================================================================
  // 2. getQuote
  // ==========================================================================

  /**
   * Get quote by ID with access check
   * Must be requester or have a request targeting user's listing
   */
  async getQuote(quoteId: number, userId: number): Promise<Quote> {
    const result = await this.db.query<QuoteRow>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quote_requests qr WHERE qr.quote_id = q.id) AS request_count,
        (SELECT COUNT(*) FROM quote_responses qresp WHERE qresp.quote_id = q.id) AS response_count
       FROM quotes q
       WHERE q.id = ?`,
      [quoteId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new QuoteNotFoundError();
    }

    const quote = result.rows[0]!;

    // Access check: requester or someone with a request/response for this quote
    if (quote.requester_user_id !== userId) {
      const accessResult = await this.db.query<{ id: number }>(
        `SELECT qr.id FROM quote_requests qr
         JOIN listings l ON l.id = qr.target_listing_id
         WHERE qr.quote_id = ? AND l.user_id = ?
         LIMIT 1`,
        [quoteId, userId]
      );

      const responseResult = await this.db.query<{ id: number }>(
        `SELECT id FROM quote_responses WHERE quote_id = ? AND responder_user_id = ? LIMIT 1`,
        [quoteId, userId]
      );

      const hasAccess =
        (accessResult.rows && accessResult.rows.length > 0) ||
        (responseResult.rows && responseResult.rows.length > 0);

      if (!hasAccess) {
        throw new UnauthorizedQuoteAccessError();
      }
    }

    return mapQuoteRow(quote);
  }

  // ==========================================================================
  // 3. getUserQuotes
  // ==========================================================================

  /**
   * List user's sent quotes with pagination
   */
  async getUserQuotes(userId: number, options: GetQuotesOptions = {}): Promise<{ items: Quote[]; total: number }> {
    const {
      status,
      serviceCategory,
      visibility,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const conditions: string[] = ['q.requester_user_id = ?'];
    const params: unknown[] = [userId];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`q.status IN (${status.map(() => '?').join(', ')})`);
        params.push(...status);
      } else {
        conditions.push('q.status = ?');
        params.push(status);
      }
    }

    if (serviceCategory) {
      conditions.push('q.service_category = ?');
      params.push(serviceCategory);
    }

    if (visibility) {
      conditions.push('q.visibility = ?');
      params.push(visibility);
    }

    const whereClause = conditions.join(' AND ');

    // Safe column allow-list
    const allowedOrderBy: Record<string, string> = {
      created_at: 'q.created_at',
      updated_at: 'q.updated_at',
      expires_at: 'q.expires_at'
    };
    const orderColumn = allowedOrderBy[orderBy] ?? 'q.created_at';
    const orderDirection = orderDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS total FROM quotes q WHERE ${whereClause}`,
      params
    );

    const total = bigIntToNumber((countResult.rows?.[0]?.total ?? 0) as bigint | number);

    const dataResult = await this.db.query<QuoteRow>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quote_requests qr WHERE qr.quote_id = q.id) AS request_count,
        (SELECT COUNT(*) FROM quote_responses qresp WHERE qresp.quote_id = q.id) AS response_count
       FROM quotes q
       WHERE ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items = (dataResult.rows ?? []).map(mapQuoteRow);
    return { items, total };
  }

  // ==========================================================================
  // 3b. getQuotesAdmin - All quotes (no user filter) for admin
  // ==========================================================================

  async getQuotesAdmin(options: GetQuotesOptions = {}): Promise<{ items: Quote[]; total: number }> {
    const {
      status,
      serviceCategory,
      visibility,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`q.status IN (${status.map(() => '?').join(', ')})`);
        params.push(...status);
      } else {
        conditions.push('q.status = ?');
        params.push(status);
      }
    }

    if (serviceCategory) {
      conditions.push('q.service_category = ?');
      params.push(serviceCategory);
    }

    if (visibility) {
      conditions.push('q.visibility = ?');
      params.push(visibility);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedOrderBy: Record<string, string> = {
      created_at: 'q.created_at',
      updated_at: 'q.updated_at',
      expires_at: 'q.expires_at'
    };
    const orderColumn = allowedOrderBy[orderBy] ?? 'q.created_at';
    const orderDirection = orderDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS total FROM quotes q ${whereClause}`,
      params
    );

    const total = bigIntToNumber((countResult.rows?.[0]?.total ?? 0) as bigint | number);

    const dataResult = await this.db.query<QuoteRow>(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quote_requests qr WHERE qr.quote_id = q.id) AS request_count,
        (SELECT COUNT(*) FROM quote_responses qresp WHERE qresp.quote_id = q.id) AS response_count
       FROM quotes q
       ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items = (dataResult.rows ?? []).map(mapQuoteRow);
    return { items, total };
  }

  // ==========================================================================
  // 4. updateQuote
  // ==========================================================================

  /**
   * Update quote - only requester can update
   */
  async updateQuote(quoteId: number, userId: number, input: UpdateQuoteInput): Promise<Quote> {
    const existingResult = await this.db.query<{ id: number; requester_user_id: number }>(
      'SELECT id, requester_user_id FROM quotes WHERE id = ?',
      [quoteId]
    );

    if (!existingResult.rows || existingResult.rows.length === 0) {
      throw new QuoteNotFoundError();
    }

    if (existingResult.rows[0]!.requester_user_id !== userId) {
      throw new UnauthorizedQuoteAccessError('Only the requester can update this quote');
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) { updates.push('title = ?'); params.push(input.title); }
    if (input.description !== undefined) { updates.push('description = ?'); params.push(input.description); }
    if (input.serviceCategory !== undefined) { updates.push('service_category = ?'); params.push(input.serviceCategory); }
    if (input.timeline !== undefined) { updates.push('timeline = ?'); params.push(input.timeline); }
    if (input.budgetMin !== undefined) { updates.push('budget_min = ?'); params.push(input.budgetMin); }
    if (input.budgetMax !== undefined) { updates.push('budget_max = ?'); params.push(input.budgetMax); }
    if (input.preferredStartDate !== undefined) { updates.push('preferred_start_date = ?'); params.push(input.preferredStartDate); }
    if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status); }
    if (input.expiresAt !== undefined) { updates.push('expires_at = ?'); params.push(input.expiresAt); }

    if (updates.length === 0) {
      return this.getQuote(quoteId, userId);
    }

    updates.push('updated_at = NOW()');
    params.push(quoteId);

    await this.db.query(
      `UPDATE quotes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getQuote(quoteId, userId);
  }

  // ==========================================================================
  // 5. deleteQuote
  // ==========================================================================

  /**
   * Soft delete (cancel) a quote - only requester can delete
   */
  async deleteQuote(quoteId: number, userId: number): Promise<void> {
    const existingResult = await this.db.query<{ id: number; requester_user_id: number }>(
      'SELECT id, requester_user_id FROM quotes WHERE id = ?',
      [quoteId]
    );

    if (!existingResult.rows || existingResult.rows.length === 0) {
      throw new QuoteNotFoundError();
    }

    if (existingResult.rows[0]!.requester_user_id !== userId) {
      throw new UnauthorizedQuoteAccessError('Only the requester can cancel this quote');
    }

    await this.db.query(
      `UPDATE quotes SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [quoteId]
    );
  }

  // ==========================================================================
  // 6. sendQuoteRequest
  // ==========================================================================

  /**
   * Send a quote to a listing/group/user
   */
  async sendQuoteRequest(userId: number, input: CreateQuoteRequestInput): Promise<QuoteRequest> {
    const { quoteId, targetType, targetListingId, targetGroupId, targetUserId } = input;

    // Verify quote belongs to user
    const quoteResult = await this.db.query<{ id: number; requester_user_id: number }>(
      'SELECT id, requester_user_id FROM quotes WHERE id = ?',
      [quoteId]
    );

    if (!quoteResult.rows || quoteResult.rows.length === 0) {
      throw new QuoteNotFoundError();
    }

    if (quoteResult.rows[0]!.requester_user_id !== userId) {
      throw new UnauthorizedQuoteAccessError('Only the requester can send quote requests');
    }

    const result = await this.db.query(
      `INSERT INTO quote_requests (
        quote_id, target_type, target_listing_id, target_group_id, target_user_id,
        invited_at, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'pending')`,
      [quoteId, targetType, targetListingId ?? null, targetGroupId ?? null, targetUserId ?? null]
    );

    const requestId = result.insertId as number;

    // Update quote status to 'open' if it's still draft
    await this.db.query(
      `UPDATE quotes SET status = 'open', updated_at = NOW() WHERE id = ? AND status = 'draft'`,
      [quoteId]
    );

    const requestResult = await this.db.query<QuoteRequestRow>(
      'SELECT * FROM quote_requests WHERE id = ?',
      [requestId]
    );

    return mapQuoteRequestRow(requestResult.rows![0]!);
  }

  // ==========================================================================
  // 7. getQuoteRequests
  // ==========================================================================

  /**
   * List requests for a quote (with access check)
   */
  async getQuoteRequests(quoteId: number, userId: number): Promise<QuoteRequest[]> {
    // Verify access
    await this.getQuote(quoteId, userId);

    const result = await this.db.query<QuoteRequestRow>(
      `SELECT qr.*,
        CASE qr.target_type
          WHEN 'listing' THEN l.name
          WHEN 'user' THEN u.name
          ELSE NULL
        END AS target_name
       FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       LEFT JOIN users u ON u.id = qr.target_user_id
       WHERE qr.quote_id = ?
       ORDER BY qr.invited_at ASC`,
      [quoteId]
    );

    return (result.rows ?? []).map(mapQuoteRequestRow);
  }

  // ==========================================================================
  // 8. markRequestViewed
  // ==========================================================================

  /**
   * Mark a quote request as viewed by the recipient
   */
  async markRequestViewed(requestId: number, userId: number): Promise<void> {
    // Verify this request targets something owned by userId
    const result = await this.db.query<{ id: number }>(
      `SELECT qr.id FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       WHERE qr.id = ? AND (l.user_id = ? OR qr.target_user_id = ?)`,
      [requestId, userId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new UnauthorizedQuoteAccessError('Not authorized to mark this request as viewed');
    }

    await this.db.query(
      `UPDATE quote_requests SET viewed_at = NOW(), status = 'viewed'
       WHERE id = ? AND viewed_at IS NULL`,
      [requestId]
    );
  }

  // ==========================================================================
  // 9. declineRequest
  // ==========================================================================

  /**
   * Decline a quote request
   */
  async declineRequest(requestId: number, userId: number): Promise<void> {
    const result = await this.db.query<{ id: number }>(
      `SELECT qr.id FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       WHERE qr.id = ? AND (l.user_id = ? OR qr.target_user_id = ?)`,
      [requestId, userId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new UnauthorizedQuoteAccessError('Not authorized to decline this request');
    }

    await this.db.query(
      `UPDATE quote_requests SET status = 'declined' WHERE id = ?`,
      [requestId]
    );
  }

  // ==========================================================================
  // 10. createQuoteResponse
  // ==========================================================================

  /**
   * Submit a bid/response to a quote
   */
  async createQuoteResponse(userId: number, input: CreateQuoteResponseInput): Promise<QuoteResponse> {
    const {
      quoteId,
      quoteRequestId = null,
      bidAmount = null,
      bidDescription,
      estimatedDuration = null,
      validUntil = null,
      responderListingId = null
    } = input;

    // Verify quote exists and is accessible
    const quoteResult = await this.db.query<{ id: number; status: string }>(
      'SELECT id, status FROM quotes WHERE id = ?',
      [quoteId]
    );

    if (!quoteResult.rows || quoteResult.rows.length === 0) {
      throw new QuoteNotFoundError();
    }

    const quoteStatus = quoteResult.rows[0]!.status;
    if (quoteStatus === 'cancelled' || quoteStatus === 'expired' || quoteStatus === 'completed') {
      throw new QuoteError(`Cannot respond to a quote with status: ${quoteStatus}`);
    }

    const result = await this.db.query(
      `INSERT INTO quote_responses (
        quote_id, quote_request_id, responder_user_id, responder_listing_id,
        bid_amount, bid_description, estimated_duration, valid_until,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [quoteId, quoteRequestId, userId, responderListingId, bidAmount, bidDescription, estimatedDuration, validUntil]
    );

    const responseId = result.insertId as number;

    // Update quote_request status to 'responded' if linked
    if (quoteRequestId) {
      await this.db.query(
        `UPDATE quote_requests SET status = 'responded' WHERE id = ?`,
        [quoteRequestId]
      );
    }

    const responseResult = await this.db.query<QuoteResponseRow>(
      `SELECT qresp.*,
        u.name AS responder_name,
        l.name AS listing_name
       FROM quote_responses qresp
       JOIN users u ON u.id = qresp.responder_user_id
       LEFT JOIN listings l ON l.id = qresp.responder_listing_id
       WHERE qresp.id = ?`,
      [responseId]
    );

    return mapQuoteResponseRow(responseResult.rows![0]!);
  }

  // ==========================================================================
  // 11. getQuoteResponses
  // ==========================================================================

  /**
   * List responses/bids for a quote
   */
  async getQuoteResponses(
    quoteId: number,
    userId: number,
    options: GetQuoteResponsesOptions = {}
  ): Promise<{ items: QuoteResponse[]; total: number }> {
    // Verify access
    await this.getQuote(quoteId, userId);

    const {
      status,
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      orderDir = 'DESC'
    } = options;

    const conditions: string[] = ['qresp.quote_id = ?'];
    const params: unknown[] = [quoteId];

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`qresp.status IN (${status.map(() => '?').join(', ')})`);
        params.push(...status);
      } else {
        conditions.push('qresp.status = ?');
        params.push(status);
      }
    }

    const whereClause = conditions.join(' AND ');

    const allowedOrderBy: Record<string, string> = {
      created_at: 'qresp.created_at',
      bid_amount: 'qresp.bid_amount'
    };
    const orderColumn = allowedOrderBy[orderBy] ?? 'qresp.created_at';
    const orderDirection = orderDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS total FROM quote_responses qresp WHERE ${whereClause}`,
      params
    );

    const total = bigIntToNumber((countResult.rows?.[0]?.total ?? 0) as bigint | number);

    const dataResult = await this.db.query<QuoteResponseRow>(
      `SELECT qresp.*,
        u.name AS responder_name,
        l.name AS listing_name
       FROM quote_responses qresp
       JOIN users u ON u.id = qresp.responder_user_id
       LEFT JOIN listings l ON l.id = qresp.responder_listing_id
       WHERE ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items = (dataResult.rows ?? []).map(mapQuoteResponseRow);
    return { items, total };
  }

  // ==========================================================================
  // 12. getReceivedQuoteRequests
  // ==========================================================================

  /**
   * Get quote requests targeting user's listings
   */
  async getReceivedQuoteRequests(
    userId: number,
    options: GetQuotesOptions = {}
  ): Promise<{ items: QuoteRequest[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const statusFilter = options.status
      ? Array.isArray(options.status)
        ? options.status
        : [options.status]
      : null;

    const conditions: string[] = [
      `(qr.target_user_id = ? OR l.user_id = ?)`
    ];
    const params: unknown[] = [userId, userId];

    if (statusFilter) {
      conditions.push(`qr.status IN (${statusFilter.map(() => '?').join(', ')})`);
      params.push(...statusFilter);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.db.query<CountRow>(
      `SELECT COUNT(*) AS total
       FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       WHERE ${whereClause}`,
      params
    );

    const total = bigIntToNumber((countResult.rows?.[0]?.total ?? 0) as bigint | number);

    const dataResult = await this.db.query<QuoteRequestRow>(
      `SELECT qr.*,
        CASE qr.target_type
          WHEN 'listing' THEN l.name
          ELSE NULL
        END AS target_name
       FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       WHERE ${whereClause}
       ORDER BY qr.invited_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const items = (dataResult.rows ?? []).map(mapQuoteRequestRow);
    return { items, total };
  }

  // ==========================================================================
  // 13. updateQuoteResponse
  // ==========================================================================

  /**
   * Update a bid/response - only the responder can update
   */
  async updateQuoteResponse(
    responseId: number,
    userId: number,
    input: UpdateQuoteResponseInput
  ): Promise<QuoteResponse> {
    const existingResult = await this.db.query<{ id: number; responder_user_id: number; quote_id: number }>(
      'SELECT id, responder_user_id, quote_id FROM quote_responses WHERE id = ?',
      [responseId]
    );

    if (!existingResult.rows || existingResult.rows.length === 0) {
      throw BizError.notFound('Quote response', responseId);
    }

    if (existingResult.rows[0]!.responder_user_id !== userId) {
      throw new UnauthorizedQuoteAccessError('Only the responder can update this bid');
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.bidAmount !== undefined) { updates.push('bid_amount = ?'); params.push(input.bidAmount); }
    if (input.bidDescription !== undefined) { updates.push('bid_description = ?'); params.push(input.bidDescription); }
    if (input.estimatedDuration !== undefined) { updates.push('estimated_duration = ?'); params.push(input.estimatedDuration); }
    if (input.validUntil !== undefined) { updates.push('valid_until = ?'); params.push(input.validUntil); }
    if (input.status !== undefined) { updates.push('status = ?'); params.push(input.status); }

    if (updates.length === 0) {
      const noopResult = await this.db.query<QuoteResponseRow>(
        `SELECT qresp.*, u.name AS responder_name, l.name AS listing_name
         FROM quote_responses qresp
         JOIN users u ON u.id = qresp.responder_user_id
         LEFT JOIN listings l ON l.id = qresp.responder_listing_id
         WHERE qresp.id = ?`,
        [responseId]
      );
      return mapQuoteResponseRow(noopResult.rows![0]!);
    }

    updates.push('updated_at = NOW()');
    params.push(responseId);

    await this.db.query(
      `UPDATE quote_responses SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedResult = await this.db.query<QuoteResponseRow>(
      `SELECT qresp.*, u.name AS responder_name, l.name AS listing_name
       FROM quote_responses qresp
       JOIN users u ON u.id = qresp.responder_user_id
       LEFT JOIN listings l ON l.id = qresp.responder_listing_id
       WHERE qresp.id = ?`,
      [responseId]
    );

    return mapQuoteResponseRow(updatedResult.rows![0]!);
  }

  // ==========================================================================
  // 14. acceptResponse
  // ==========================================================================

  /**
   * Accept a bid - updates quote status to in_progress
   */
  async acceptResponse(responseId: number, userId: number): Promise<void> {
    const result = await this.db.query<{ id: number; quote_id: number; status: string }>(
      `SELECT qresp.id, qresp.quote_id, qresp.status
       FROM quote_responses qresp
       JOIN quotes q ON q.id = qresp.quote_id
       WHERE qresp.id = ? AND q.requester_user_id = ?`,
      [responseId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new UnauthorizedQuoteAccessError('Not authorized to accept this response');
    }

    const { quote_id: quoteId } = result.rows[0]!;

    await this.db.query(
      `UPDATE quote_responses SET status = 'accepted', updated_at = NOW() WHERE id = ?`,
      [responseId]
    );

    // Update quote status to in_progress
    await this.db.query(
      `UPDATE quotes SET status = 'in_progress', updated_at = NOW() WHERE id = ?`,
      [quoteId]
    );
  }

  // ==========================================================================
  // 15. rejectResponse
  // ==========================================================================

  /**
   * Reject a bid
   */
  async rejectResponse(responseId: number, userId: number): Promise<void> {
    const result = await this.db.query<{ id: number }>(
      `SELECT qresp.id
       FROM quote_responses qresp
       JOIN quotes q ON q.id = qresp.quote_id
       WHERE qresp.id = ? AND q.requester_user_id = ?`,
      [responseId, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new UnauthorizedQuoteAccessError('Not authorized to reject this response');
    }

    await this.db.query(
      `UPDATE quote_responses SET status = 'rejected', updated_at = NOW() WHERE id = ?`,
      [responseId]
    );
  }

  // ==========================================================================
  // 16. getQuoteDashboardSummary
  // ==========================================================================

  /**
   * Get dashboard stats for a user
   */
  async getQuoteDashboardSummary(userId: number): Promise<QuoteDashboardSummary> {
    // Sent quotes stats
    const sentResult = await this.db.query<{
      total: bigint | number;
      open: bigint | number;
      in_progress: bigint | number;
      completed: bigint | number;
    }>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
       FROM quotes
       WHERE requester_user_id = ?`,
      [userId]
    );

    const sentRow = sentResult.rows?.[0] ?? { total: 0, open: 0, in_progress: 0, completed: 0 };

    // Received requests stats (targeting user's listings)
    const receivedResult = await this.db.query<{
      total: bigint | number;
      pending: bigint | number;
      responded: bigint | number;
    }>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN qr.status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN qr.status = 'responded' THEN 1 ELSE 0 END) AS responded
       FROM quote_requests qr
       LEFT JOIN listings l ON l.id = qr.target_listing_id
       WHERE qr.target_user_id = ? OR l.user_id = ?`,
      [userId, userId]
    );

    const receivedRow = receivedResult.rows?.[0] ?? { total: 0, pending: 0, responded: 0 };

    // My responses stats
    const responsesResult = await this.db.query<{
      total: bigint | number;
      pending: bigint | number;
      accepted: bigint | number;
    }>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted
       FROM quote_responses
       WHERE responder_user_id = ?`,
      [userId]
    );

    const responsesRow = responsesResult.rows?.[0] ?? { total: 0, pending: 0, accepted: 0 };

    return {
      sentQuotes: {
        total: bigIntToNumber(sentRow.total as bigint | number),
        open: bigIntToNumber(sentRow.open as bigint | number),
        inProgress: bigIntToNumber(sentRow.in_progress as bigint | number),
        completed: bigIntToNumber(sentRow.completed as bigint | number)
      },
      receivedRequests: {
        total: bigIntToNumber(receivedRow.total as bigint | number),
        pending: bigIntToNumber(receivedRow.pending as bigint | number),
        responded: bigIntToNumber(receivedRow.responded as bigint | number)
      },
      myResponses: {
        total: bigIntToNumber(responsesRow.total as bigint | number),
        pending: bigIntToNumber(responsesRow.pending as bigint | number),
        accepted: bigIntToNumber(responsesRow.accepted as bigint | number)
      }
    };
  }

  // ==========================================================================
  // 17. sendQuoteMessage
  // ==========================================================================

  /**
   * Send a message within a quote thread
   */
  async sendQuoteMessage(
    userId: number,
    quoteId: number,
    content: string,
    responseId?: number
  ): Promise<QuoteMessage> {
    // Verify access to the quote
    await this.getQuote(quoteId, userId);

    const result = await this.db.query(
      `INSERT INTO quote_messages (quote_id, quote_response_id, sender_user_id, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [quoteId, responseId ?? null, userId, content]
    );

    const messageId = result.insertId as number;

    const messageResult = await this.db.query<QuoteMessageRow>(
      `SELECT qm.*, u.name AS sender_name
       FROM quote_messages qm
       JOIN users u ON u.id = qm.sender_user_id
       WHERE qm.id = ?`,
      [messageId]
    );

    return mapQuoteMessageRow(messageResult.rows![0]!);
  }

  // ==========================================================================
  // 18. getQuoteMessages
  // ==========================================================================

  /**
   * Get messages for a quote thread
   */
  async getQuoteMessages(
    quoteId: number,
    userId: number,
    responseId?: number
  ): Promise<QuoteMessage[]> {
    // Verify access to the quote
    await this.getQuote(quoteId, userId);

    const conditions: string[] = ['qm.quote_id = ?'];
    const params: unknown[] = [quoteId];

    if (responseId !== undefined) {
      conditions.push('qm.quote_response_id = ?');
      params.push(responseId);
    }

    const result = await this.db.query<QuoteMessageRow>(
      `SELECT qm.*, u.name AS sender_name
       FROM quote_messages qm
       JOIN users u ON u.id = qm.sender_user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY qm.created_at ASC`,
      params
    );

    return (result.rows ?? []).map(mapQuoteMessageRow);
  }
}
