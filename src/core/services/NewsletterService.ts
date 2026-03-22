/**
 * NewsletterService - Newsletter Content Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Type Safety: Typed database rows (ContentNewsletterRow)
 * - MariaDB patterns: ? placeholders, bigIntToNumber, JSON parse guard, TINYINT boolean
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase 1
 * @reference src/core/services/ContentService.ts - Exact patterns replicated
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { DbResult } from '@core/types/db';
import type { ContentNewsletterRow } from '@core/types/db-rows';
import type {
  Newsletter,
  NewsletterFilters,
  NewsletterSortOption,
  CreateNewsletterInput,
  UpdateNewsletterInput,
  NewsletterSubscriber,
  NewsletterAnalyticsSummary,
  SubscriberGrowthData,
  DeliveryStats
} from '@core/types/newsletter';
import { NewsletterStatus, SubscriberStatus } from '@core/types/newsletter';
import type { NewsletterSubscriberRow } from '@core/types/db-rows';

// ============================================================================
// Local Pagination Types (matches ContentService pattern)
// ============================================================================

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class NewsletterNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'NEWSLETTER_NOT_FOUND',
      message: `Newsletter not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested newsletter was not found'
    });
  }
}

export class DuplicateNewsletterSlugError extends BizError {
  constructor(slug: string) {
    super({
      code: 'DUPLICATE_NEWSLETTER_SLUG',
      message: `Newsletter slug already exists: ${slug}`,
      context: { slug },
      userMessage: 'A newsletter with this URL slug already exists'
    });
  }
}

// ============================================================================
// NewsletterService Implementation
// ============================================================================

export class NewsletterService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get newsletters with optional filters, pagination, and sorting
   */
  async getNewsletters(
    filters?: NewsletterFilters,
    pagination?: PaginationParams,
    sort?: NewsletterSortOption
  ): Promise<PaginatedResult<Newsletter>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT cn.* FROM content_newsletters cn';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE conditions from filters
    if (filters?.listing_id !== undefined) {
      conditions.push('cn.listing_id = ?');
      params.push(filters.listing_id);
    }

    if (filters?.status !== undefined) {
      conditions.push('cn.status = ?');
      params.push(filters.status);
    }

    if (filters?.category_id !== undefined) {
      conditions.push('cn.category_id = ?');
      params.push(filters.category_id);
    }

    if (filters?.is_featured !== undefined) {
      conditions.push('cn.is_featured = ?');
      params.push(filters.is_featured ? 1 : 0);
    }

    if (filters?.searchQuery) {
      conditions.push('(cn.title LIKE ? OR cn.excerpt LIKE ?)');
      const searchParam = `%${filters.searchQuery}%`;
      params.push(searchParam, searchParam);
    }

    if (filters?.followedListingIds && filters.followedListingIds.length > 0) {
      const placeholders = filters.followedListingIds.map(() => '?').join(',');
      conditions.push(`cn.listing_id IN (${placeholders})`);
      params.push(...filters.followedListingIds);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM content_newsletters cn${
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    }`;
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, params);
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Add sorting
    sql += ' ' + this.buildSortClause(sort);

    // Add pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const result: DbResult<ContentNewsletterRow> = await this.db.query<ContentNewsletterRow>(sql, params);

    return {
      data: result.rows.map(row => this.mapRowToNewsletter(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get newsletter by slug
   */
  async getNewsletterBySlug(slug: string): Promise<Newsletter | null> {
    const result: DbResult<ContentNewsletterRow> = await this.db.query<ContentNewsletterRow>(
      'SELECT * FROM content_newsletters WHERE slug = ?',
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToNewsletter(row);
  }

  /**
   * Get newsletter by ID
   */
  async getNewsletterById(id: number): Promise<Newsletter | null> {
    const result: DbResult<ContentNewsletterRow> = await this.db.query<ContentNewsletterRow>(
      'SELECT * FROM content_newsletters WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) return null;

    return this.mapRowToNewsletter(row);
  }

  // ==========================================================================
  // WRITE OPERATIONS
  // ==========================================================================

  /**
   * Create a new newsletter
   */
  async createNewsletter(data: CreateNewsletterInput): Promise<Newsletter> {
    // Generate slug if not provided
    const slug = data.slug || await this.generateSlug(data.title);

    // Check for duplicate slug
    const existing = await this.getNewsletterBySlug(slug);
    if (existing) {
      throw new DuplicateNewsletterSlugError(slug);
    }

    // Insert newsletter
    const tagsJson = JSON.stringify(data.tags || []);
    const result: DbResult<ContentNewsletterRow> = await this.db.query<ContentNewsletterRow>(
      `INSERT INTO content_newsletters
       (listing_id, title, slug, issue_number, excerpt, web_content, email_html,
        featured_image, category_id, tags, reading_time, is_featured, status,
        scheduled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [
        data.listing_id,
        data.title,
        slug,
        data.issue_number || null,
        data.excerpt || null,
        data.web_content || null,
        data.email_html || null,
        data.featured_image || null,
        data.category_id || null,
        tagsJson,
        data.reading_time || null,
        data.is_featured ? 1 : 0,
        data.scheduled_at || null
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError('create newsletter', new Error('No insert ID returned'));
    }

    const created = await this.getNewsletterById(result.insertId);
    if (!created) {
      throw BizError.databaseError('create newsletter', new Error('Failed to retrieve created newsletter'));
    }

    return created;
  }

  /**
   * Update a newsletter
   */
  async updateNewsletter(id: number, data: UpdateNewsletterInput): Promise<Newsletter> {
    // Check newsletter exists
    const existing = await this.getNewsletterById(id);
    if (!existing) {
      throw new NewsletterNotFoundError(id);
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await this.getNewsletterBySlug(data.slug);
      if (duplicate) {
        throw new DuplicateNewsletterSlugError(data.slug);
      }
    }

    // Build dynamic SET columns
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.slug !== undefined) {
      updates.push('slug = ?');
      params.push(data.slug);
    }

    if (data.issue_number !== undefined) {
      updates.push('issue_number = ?');
      params.push(data.issue_number);
    }

    if (data.excerpt !== undefined) {
      updates.push('excerpt = ?');
      params.push(data.excerpt);
    }

    if (data.web_content !== undefined) {
      updates.push('web_content = ?');
      params.push(data.web_content);
    }

    if (data.email_html !== undefined) {
      updates.push('email_html = ?');
      params.push(data.email_html);
    }

    if (data.featured_image !== undefined) {
      updates.push('featured_image = ?');
      params.push(data.featured_image);
    }

    if (data.category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(data.category_id);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (data.reading_time !== undefined) {
      updates.push('reading_time = ?');
      params.push(data.reading_time);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(data.is_featured ? 1 : 0);
    }

    if (data.scheduled_at !== undefined) {
      updates.push('scheduled_at = ?');
      params.push(data.scheduled_at);
    }

    if (data.sent_at !== undefined) {
      updates.push('sent_at = ?');
      params.push(data.sent_at);
    }

    if (data.published_at !== undefined) {
      updates.push('published_at = ?');
      params.push(data.published_at);
    }

    if (data.subscriber_count_at_send !== undefined) {
      updates.push('subscriber_count_at_send = ?');
      params.push(data.subscriber_count_at_send);
    }

    if (updates.length === 0) {
      return existing;
    }

    params.push(id);

    await this.db.query(
      `UPDATE content_newsletters SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getNewsletterById(id);
    if (!updated) {
      throw BizError.databaseError('update newsletter', new Error('Failed to retrieve updated newsletter'));
    }

    return updated;
  }

  /**
   * Delete a newsletter
   */
  async deleteNewsletter(id: number): Promise<void> {
    const newsletter = await this.getNewsletterById(id);
    if (!newsletter) {
      throw new NewsletterNotFoundError(id);
    }

    await this.db.query('DELETE FROM content_newsletters WHERE id = ?', [id]);
  }

  /**
   * Increment view count (fire-and-forget)
   */
  async incrementViewCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_newsletters SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Get all active subscribers for a listing's newsletter
   */
  async getActiveSubscribers(listingId: number): Promise<NewsletterSubscriber[]> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      `SELECT * FROM newsletter_subscribers WHERE listing_id = ? AND status = 'active'`,
      [listingId]
    );
    return result.rows.map(row => this.mapRowToSubscriber(row));
  }

  /**
   * Send a newsletter: validates, marks as published, returns subscribers for email delivery
   * Design: Service marks newsletter as sent, API route handles actual email delivery
   */
  async sendNewsletter(id: number): Promise<{
    newsletter: Newsletter;
    subscribers: NewsletterSubscriber[];
  }> {
    const newsletter = await this.getNewsletterById(id);
    if (!newsletter) {
      throw new NewsletterNotFoundError(id);
    }

    if (newsletter.status !== NewsletterStatus.DRAFT && newsletter.status !== NewsletterStatus.SCHEDULED) {
      throw new BizError({
        code: 'NEWSLETTER_NOT_SENDABLE',
        message: `Newsletter is ${newsletter.status}, must be draft or scheduled`,
        userMessage: 'This newsletter has already been sent or archived'
      });
    }

    if (!newsletter.web_content && !newsletter.email_html) {
      throw new BizError({
        code: 'NEWSLETTER_NO_CONTENT',
        message: 'Newsletter has no content',
        userMessage: 'Add content to your newsletter before sending'
      });
    }

    const subscribers = await this.getActiveSubscribers(newsletter.listing_id);
    if (subscribers.length === 0) {
      throw new BizError({
        code: 'NO_SUBSCRIBERS',
        message: 'No active subscribers',
        userMessage: 'You need at least one subscriber to send a newsletter'
      });
    }

    // Update newsletter status and snapshot subscriber count
    const now = new Date();
    const updated = await this.updateNewsletter(id, {
      status: NewsletterStatus.PUBLISHED,
      published_at: now,
      sent_at: now,
      subscriber_count_at_send: subscribers.length,
    });

    return { newsletter: updated, subscribers };
  }

  // ==========================================================================
  // ANALYTICS OPERATIONS (Phase N8)
  // ==========================================================================

  /**
   * Get analytics summary for a specific newsletter within a date range
   */
  async getNewsletterAnalytics(newsletterId: number, startDate: string, endDate: string): Promise<NewsletterAnalyticsSummary> {
    // Get newsletter info for subscriber count at send
    const newsletter = await this.getNewsletterById(newsletterId);

    // Get event counts by type
    const eventCounts = await this.db.query<{ event_type: string; count: bigint | number }>(
      `SELECT event_type, COUNT(*) as count FROM newsletter_analytics
       WHERE newsletter_id = ? AND created_at >= ? AND created_at <= ?
       GROUP BY event_type`,
      [newsletterId, startDate + ' 00:00:00', endDate + ' 23:59:59']
    );

    const counts: Record<string, number> = {};
    for (const row of eventCounts.rows) {
      counts[row.event_type] = bigIntToNumber(row.count);
    }

    const subscriberCountAtSend = newsletter?.subscriber_count_at_send || 0;
    const opens = counts['open'] || 0;
    const clicks = counts['click'] || 0;

    // Get daily trend data
    const trendResult = await this.db.query<{ date: string; event_type: string; count: bigint | number }>(
      `SELECT DATE(created_at) as date, event_type, COUNT(*) as count
       FROM newsletter_analytics
       WHERE newsletter_id = ? AND created_at >= ? AND created_at <= ?
       GROUP BY DATE(created_at), event_type
       ORDER BY date ASC`,
      [newsletterId, startDate + ' 00:00:00', endDate + ' 23:59:59']
    );

    // Group trend data by date
    const trendMap = new Map<string, { opens: number; clicks: number; views: number }>();
    for (const row of trendResult.rows) {
      const dateStr = row.date;
      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, { opens: 0, clicks: 0, views: 0 });
      }
      const entry = trendMap.get(dateStr)!;
      const val = bigIntToNumber(row.count);
      if (row.event_type === 'open') entry.opens = val;
      else if (row.event_type === 'click') entry.clicks = val;
      else if (row.event_type === 'page_view') entry.views = val;
    }

    const dailyTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));

    // Get top clicked links
    const topLinksResult = await this.db.query<{ link_url: string; count: bigint | number }>(
      `SELECT link_url, COUNT(*) as count FROM newsletter_analytics
       WHERE newsletter_id = ? AND event_type = 'click' AND link_url IS NOT NULL
         AND created_at >= ? AND created_at <= ?
       GROUP BY link_url
       ORDER BY count DESC
       LIMIT 10`,
      [newsletterId, startDate + ' 00:00:00', endDate + ' 23:59:59']
    );

    const topLinks = topLinksResult.rows.map(row => ({
      url: row.link_url,
      clicks: bigIntToNumber(row.count)
    }));

    return {
      totals: {
        opens,
        clicks,
        views: counts['page_view'] || 0,
        shares: counts['share'] || 0,
        bookmarks: counts['bookmark'] || 0,
        subscriberCountAtSend,
        openRate: subscriberCountAtSend > 0 ? (opens / subscriberCountAtSend) * 100 : 0,
        clickRate: subscriberCountAtSend > 0 ? (clicks / subscriberCountAtSend) * 100 : 0,
      },
      dailyTrend,
      topLinks,
      deliveryStats: {
        sentAt: newsletter?.sent_at ? newsletter.sent_at.toISOString() : null,
        subscriberCountAtSend,
      },
    };
  }

  /**
   * Get subscriber growth data for a listing within a date range
   */
  async getSubscriberGrowth(listingId: number, startDate: string, endDate: string): Promise<SubscriberGrowthData> {
    // Daily new subscriptions
    const subscribedResult = await this.db.query<{ date: string; count: bigint | number }>(
      `SELECT DATE(subscribed_at) as date, COUNT(*) as count
       FROM newsletter_subscribers
       WHERE listing_id = ? AND subscribed_at >= ? AND subscribed_at <= ?
       GROUP BY DATE(subscribed_at)
       ORDER BY date ASC`,
      [listingId, startDate + ' 00:00:00', endDate + ' 23:59:59']
    );

    // Daily unsubscribes
    const unsubscribedResult = await this.db.query<{ date: string; count: bigint | number }>(
      `SELECT DATE(unsubscribed_at) as date, COUNT(*) as count
       FROM newsletter_subscribers
       WHERE listing_id = ? AND unsubscribed_at >= ? AND unsubscribed_at <= ?
       GROUP BY DATE(unsubscribed_at)
       ORDER BY date ASC`,
      [listingId, startDate + ' 00:00:00', endDate + ' 23:59:59']
    );

    // Merge into daily array
    const dateMap = new Map<string, { subscribed: number; unsubscribed: number }>();
    for (const row of subscribedResult.rows) {
      dateMap.set(row.date, { subscribed: bigIntToNumber(row.count), unsubscribed: 0 });
    }
    for (const row of unsubscribedResult.rows) {
      const existing = dateMap.get(row.date) || { subscribed: 0, unsubscribed: 0 };
      existing.unsubscribed = bigIntToNumber(row.count);
      dateMap.set(row.date, existing);
    }

    const daily = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      subscribed: data.subscribed,
      unsubscribed: data.unsubscribed,
      net: data.subscribed - data.unsubscribed,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Current totals by status
    const totalsResult = await this.db.query<{ status: string; count: bigint | number }>(
      `SELECT status, COUNT(*) as count FROM newsletter_subscribers
       WHERE listing_id = ? GROUP BY status`,
      [listingId]
    );

    const totals = { active: 0, pending: 0, unsubscribed: 0, bounced: 0 };
    for (const row of totalsResult.rows) {
      const val = bigIntToNumber(row.count);
      if (row.status === 'active') totals.active = val;
      else if (row.status === 'pending') totals.pending = val;
      else if (row.status === 'unsubscribed') totals.unsubscribed = val;
      else if (row.status === 'bounced') totals.bounced = val;
    }

    return { daily, totals };
  }

  /**
   * Get delivery stats across all newsletters for a listing
   */
  async getDeliveryStats(listingId: number): Promise<DeliveryStats> {
    const result = await this.db.query<{
      id: number;
      title: string;
      sent_at: string;
      subscriber_count_at_send: number;
      open_count: number;
      click_count: number;
    }>(
      `SELECT id, title, sent_at, subscriber_count_at_send, open_count, click_count
       FROM content_newsletters
       WHERE listing_id = ? AND sent_at IS NOT NULL
       ORDER BY sent_at DESC`,
      [listingId]
    );

    let totalOpens = 0;
    let totalClicks = 0;
    let totalSubscribers = 0;

    const newsletters = result.rows.map(row => {
      totalOpens += row.open_count;
      totalClicks += row.click_count;
      totalSubscribers += row.subscriber_count_at_send;

      const openRate = row.subscriber_count_at_send > 0
        ? (row.open_count / row.subscriber_count_at_send) * 100 : 0;
      const clickRate = row.subscriber_count_at_send > 0
        ? (row.click_count / row.subscriber_count_at_send) * 100 : 0;

      return {
        id: row.id,
        title: row.title,
        sentAt: row.sent_at,
        subscriberCountAtSend: row.subscriber_count_at_send,
        openCount: row.open_count,
        clickCount: row.click_count,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
      };
    });

    return {
      totalSent: newsletters.length,
      totalOpens,
      totalClicks,
      avgOpenRate: totalSubscribers > 0 ? Math.round((totalOpens / totalSubscribers) * 1000) / 10 : 0,
      avgClickRate: totalSubscribers > 0 ? Math.round((totalClicks / totalSubscribers) * 1000) / 10 : 0,
      newsletters,
    };
  }

  /**
   * Increment open count (fire-and-forget, mirrors incrementViewCount)
   */
  async incrementOpenCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_newsletters SET open_count = open_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Increment click count (fire-and-forget)
   */
  async incrementClickCount(id: number): Promise<void> {
    await this.db.query(
      'UPDATE content_newsletters SET click_count = click_count + 1 WHERE id = ?',
      [id]
    );
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Generate a unique slug from title
   */
  private async generateSlug(title: string): Promise<string> {
    // Convert to lowercase and replace spaces/special chars with hyphens
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ensure uniqueness
    let counter = 1;
    let uniqueSlug = slug;

    for (;;) {
      const existing = await this.getNewsletterBySlug(uniqueSlug);
      if (!existing) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;

      if (counter > 1000) {
        throw BizError.internalServerError(
          'NewsletterService',
          new Error('Failed to generate unique slug after 1000 attempts')
        );
      }
    }

    return uniqueSlug;
  }

  /**
   * Build SQL sort clause from sort option
   */
  private buildSortClause(sort?: NewsletterSortOption): string {
    switch (sort) {
      case 'recent':
        return 'ORDER BY cn.published_at DESC, cn.created_at DESC';
      case 'popular':
        return 'ORDER BY cn.view_count DESC';
      case 'alphabetical':
        return 'ORDER BY cn.title ASC';
      case 'issue_number':
        return 'ORDER BY cn.issue_number DESC';
      default:
        return 'ORDER BY cn.published_at DESC, cn.created_at DESC';
    }
  }

  // ==========================================================================
  // SUBSCRIBER OPERATIONS
  // ==========================================================================

  /**
   * Subscribe an email to a listing's newsletter.
   * - If user is authenticated (userId provided), auto-confirm (status='active')
   * - If anonymous, create as 'pending' with confirmation_token
   * - Uses UPSERT: re-subscribing a previously unsubscribed email reactivates
   *
   * @returns { subscriber, isNew, requiresConfirmation }
   */
  async subscribe(
    listingId: number,
    email: string,
    name?: string | null,
    userId?: number | null
  ): Promise<{ subscriber: NewsletterSubscriber; isNew: boolean; requiresConfirmation: boolean }> {
    const existing = await this.getSubscriberByEmail(listingId, email);

    if (existing) {
      if (existing.status === SubscriberStatus.ACTIVE) {
        return { subscriber: existing, isNew: false, requiresConfirmation: false };
      }

      if (existing.status === SubscriberStatus.UNSUBSCRIBED || existing.status === SubscriberStatus.BOUNCED) {
        const isAuthUser = !!userId;
        const newStatus = isAuthUser ? SubscriberStatus.ACTIVE : SubscriberStatus.PENDING;
        const token = isAuthUser ? null : crypto.randomUUID();

        await this.db.query(
          `UPDATE newsletter_subscribers SET status = ?, confirmation_token = ?, user_id = ?,
           name = COALESCE(?, name), subscribed_at = ?, unsubscribed_at = NULL WHERE id = ?`,
          [newStatus, token, userId || existing.user_id, name, isAuthUser ? new Date() : null, existing.id]
        );

        const updated = await this.getSubscriberById(existing.id);
        return { subscriber: updated!, isNew: false, requiresConfirmation: !isAuthUser };
      }

      if (existing.status === SubscriberStatus.PENDING) {
        const token = crypto.randomUUID();
        await this.db.query(
          'UPDATE newsletter_subscribers SET confirmation_token = ? WHERE id = ?',
          [token, existing.id]
        );
        const updated = await this.getSubscriberById(existing.id);
        return { subscriber: updated!, isNew: false, requiresConfirmation: true };
      }
    }

    const isAuthUser = !!userId;
    const status = isAuthUser ? SubscriberStatus.ACTIVE : SubscriberStatus.PENDING;
    const token = isAuthUser ? null : crypto.randomUUID();

    const result = await this.db.query(
      `INSERT INTO newsletter_subscribers (listing_id, user_id, email, name, status, confirmation_token, subscribed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [listingId, userId || null, email, name || null, status, token, isAuthUser ? new Date() : null]
    );

    const subscriber = await this.getSubscriberById(result.insertId!);
    return { subscriber: subscriber!, isNew: true, requiresConfirmation: !isAuthUser };
  }

  /**
   * Confirm a pending subscription via confirmation token.
   * Activates the subscriber and clears the token.
   */
  async confirmSubscription(token: string): Promise<NewsletterSubscriber | null> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      `SELECT * FROM newsletter_subscribers WHERE confirmation_token = ? AND status = 'pending' LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0 || !result.rows[0]) return null;

    const row = result.rows[0];

    await this.db.query(
      `UPDATE newsletter_subscribers SET status = 'active', confirmation_token = NULL,
       subscribed_at = NOW() WHERE id = ?`,
      [row.id]
    );

    return this.getSubscriberById(row.id);
  }

  /**
   * Unsubscribe by email and listing ID.
   * Sets status to 'unsubscribed' with timestamp.
   */
  async unsubscribe(listingId: number, email: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW(),
       confirmation_token = NULL WHERE listing_id = ? AND email = ? AND status IN ('active', 'pending')`,
      [listingId, email]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Unsubscribe by token (for email unsubscribe links).
   * Finds subscriber by confirmation_token set during subscribe, marks unsubscribed.
   */
  async unsubscribeByToken(token: string): Promise<{ success: boolean; email?: string; listingId?: number }> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      `SELECT * FROM newsletter_subscribers WHERE confirmation_token = ? LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return { success: false };
    }

    const row = result.rows[0];

    await this.db.query(
      `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW(),
       confirmation_token = NULL WHERE id = ?`,
      [row.id]
    );

    return { success: true, email: row.email, listingId: row.listing_id };
  }

  /**
   * Get active subscriber count for a listing's newsletter.
   */
  async getSubscriberCount(listingId: number): Promise<number> {
    const result = await this.db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM newsletter_subscribers WHERE listing_id = ? AND status = 'active'`,
      [listingId]
    );
    return bigIntToNumber(result.rows[0]?.total);
  }

  /**
   * Check if an email is subscribed to a listing's newsletter.
   */
  async getSubscriptionStatus(listingId: number, email: string): Promise<SubscriberStatus | null> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      'SELECT status FROM newsletter_subscribers WHERE listing_id = ? AND email = ? LIMIT 1',
      [listingId, email]
    );
    if (result.rows.length === 0 || !result.rows[0]) return null;
    return result.rows[0].status as SubscriberStatus;
  }

  /**
   * Get subscriber by ID (internal helper).
   */
  private async getSubscriberById(id: number): Promise<NewsletterSubscriber | null> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      'SELECT * FROM newsletter_subscribers WHERE id = ? LIMIT 1',
      [id]
    );
    if (result.rows.length === 0 || !result.rows[0]) return null;
    return this.mapRowToSubscriber(result.rows[0]);
  }

  /**
   * Get subscriber by email for a listing (internal helper).
   */
  private async getSubscriberByEmail(listingId: number, email: string): Promise<NewsletterSubscriber | null> {
    const result = await this.db.query<NewsletterSubscriberRow>(
      'SELECT * FROM newsletter_subscribers WHERE listing_id = ? AND email = ? LIMIT 1',
      [listingId, email]
    );
    if (result.rows.length === 0 || !result.rows[0]) return null;
    return this.mapRowToSubscriber(result.rows[0]);
  }

  /**
   * Map database row to NewsletterSubscriber.
   */
  private mapRowToSubscriber(row: NewsletterSubscriberRow): NewsletterSubscriber {
    return {
      id: row.id,
      listing_id: row.listing_id,
      user_id: row.user_id,
      email: row.email,
      name: row.name,
      status: row.status as SubscriberStatus,
      confirmation_token: row.confirmation_token,
      subscribed_at: row.subscribed_at ? new Date(row.subscribed_at) : null,
      unsubscribed_at: row.unsubscribed_at ? new Date(row.unsubscribed_at) : null,
      created_at: new Date(row.created_at),
    };
  }

  /**
   * Map database row to Newsletter application entity
   * GOVERNANCE: mariadb auto-parses JSON columns - check if already array
   * GOVERNANCE: TINYINT(1) → boolean via !! operator
   */
  private mapRowToNewsletter(row: ContentNewsletterRow): Newsletter {
    return {
      id: row.id,
      listing_id: row.listing_id,
      title: row.title,
      slug: row.slug,
      issue_number: row.issue_number,
      excerpt: row.excerpt,
      web_content: row.web_content,
      email_html: row.email_html,
      featured_image: row.featured_image,
      category_id: row.category_id,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already array
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      reading_time: row.reading_time,
      status: row.status as NewsletterStatus,
      is_featured: !!row.is_featured,
      subscriber_count_at_send: row.subscriber_count_at_send,
      open_count: row.open_count,
      click_count: row.click_count,
      view_count: row.view_count,
      bookmark_count: row.bookmark_count,
      share_count: row.share_count,
      scheduled_at: row.scheduled_at ? new Date(row.scheduled_at) : null,
      sent_at: row.sent_at ? new Date(row.sent_at) : null,
      published_at: row.published_at ? new Date(row.published_at) : null,
      created_at: new Date(row.created_at),
      updated_at: row.updated_at ? new Date(row.updated_at) : null
    };
  }
}
