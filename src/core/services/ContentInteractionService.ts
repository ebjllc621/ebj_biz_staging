/**
 * ContentInteractionService - Parameterized Content Interaction Service
 *
 * Handles bookmark toggle, report submission, and comment CRUD for all
 * content types (article, podcast, video) via a single parameterized service.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - bigIntToNumber: ALL COUNT(*) queries use bigIntToNumber()
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_3A_INTERACTION_INFRASTRUCTURE.md
 * @tier STANDARD
 * @phase Content Phase 3A
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { getAdminActivityService } from '@core/services/AdminActivityService';

// ============================================================================
// Types
// ============================================================================

export type ContentType = 'article' | 'podcast' | 'video' | 'newsletter' | 'guide';

export interface ContentComment {
  id: number;
  content_type: ContentType;
  content_id: number;
  user_id: number;
  parent_id: number | null;
  comment_text: string;
  status: 'active' | 'hidden' | 'deleted';
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * ContentComment enriched with user display data via LEFT JOIN users.
 * Used by Phase 3B getComments() which returns user info for display.
 */
export interface ContentCommentWithUser extends ContentComment {
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
}

// ============================================================================
// ContentInteractionService
// ============================================================================

export class ContentInteractionService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Map content type to its database table name
   */
  private getContentTable(contentType: ContentType): string {
    const tables: Record<ContentType, string> = {
      article: 'content_articles',
      podcast: 'content_podcasts',
      video: 'content_videos',
      newsletter: 'content_newsletters',
      guide: 'content_guides',
    };
    return tables[contentType];
  }

  /**
   * Verify content item exists and return minimal data
   */
  private async verifyContentExists(
    contentType: ContentType,
    contentId: number
  ): Promise<{ id: number; title: string; slug: string; listing_id: number | null } | null> {
    const table = this.getContentTable(contentType);
    const result = await this.db.query<{
      id: number;
      title: string;
      slug: string;
      listing_id: number | null;
    }>(
      `SELECT id, title, slug, listing_id FROM ${table} WHERE id = ? AND status = 'published' LIMIT 1`,
      [contentId]
    );
    return result.rows[0] ?? null;
  }

  // ==========================================================================
  // Bookmarks
  // ==========================================================================

  /**
   * Toggle bookmark state for a content item.
   * Creates bookmark if none exists, deletes if already bookmarked.
   * Updates denormalized bookmark_count on the content table.
   */
  async toggleBookmark(
    userId: number,
    contentType: ContentType,
    contentId: number
  ): Promise<{ bookmarked: boolean }> {
    const table = this.getContentTable(contentType);

    // Check existing bookmark
    const existingResult = await this.db.query<{ id: number }>(
      'SELECT id FROM user_bookmarks WHERE user_id = ? AND entity_type = ? AND entity_id = ?',
      [userId, contentType, contentId]
    );

    const exists = existingResult.rows.length > 0;

    if (exists) {
      // Remove bookmark
      await this.db.query(
        'DELETE FROM user_bookmarks WHERE user_id = ? AND entity_type = ? AND entity_id = ?',
        [userId, contentType, contentId]
      );
      // Decrement bookmark_count (floor at 0)
      await this.db.query(
        `UPDATE ${table} SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = ?`,
        [contentId]
      );
      return { bookmarked: false };
    } else {
      // Add bookmark
      await this.db.query(
        'INSERT INTO user_bookmarks (user_id, entity_type, entity_id) VALUES (?, ?, ?)',
        [userId, contentType, contentId]
      );
      // Increment bookmark_count
      await this.db.query(
        `UPDATE ${table} SET bookmark_count = bookmark_count + 1 WHERE id = ?`,
        [contentId]
      );
      return { bookmarked: true };
    }
  }

  /**
   * Check if a user has bookmarked a content item
   */
  async isBookmarked(
    userId: number,
    contentType: ContentType,
    contentId: number
  ): Promise<boolean> {
    const result = await this.db.query<{ id: number }>(
      'SELECT id FROM user_bookmarks WHERE user_id = ? AND entity_type = ? AND entity_id = ? LIMIT 1',
      [userId, contentType, contentId]
    );
    return result.rows.length > 0;
  }

  /**
   * Get the current bookmark count for a content item
   */
  async getBookmarkCount(contentType: ContentType, contentId: number): Promise<number> {
    const table = this.getContentTable(contentType);
    const result = await this.db.query<{ bookmark_count: number | bigint }>(
      `SELECT bookmark_count FROM ${table} WHERE id = ? LIMIT 1`,
      [contentId]
    );
    const row = result.rows[0];
    if (!row) return 0;
    return bigIntToNumber(row.bookmark_count);
  }

  // ==========================================================================
  // Reports
  // ==========================================================================

  /**
   * Submit a moderation report for a content item.
   * Enforces one report per user per content item.
   * Logs via AdminActivityService with action_type='content_report'.
   */
  async submitReport(
    userId: number,
    userEmail: string,
    contentType: ContentType,
    contentId: number,
    reason: string,
    details?: string
  ): Promise<{ reported: boolean }> {
    // Verify content exists
    const content = await this.verifyContentExists(contentType, contentId);
    if (!content) {
      throw new Error(`Content item not found: ${contentType}/${contentId}`);
    }

    // Check for duplicate report
    const duplicateResult = await this.db.query<{ id: number }>(
      `SELECT id FROM admin_activity
       WHERE action_type = 'content_report'
         AND target_entity_id = ?
         AND target_entity_type = ?
         AND JSON_EXTRACT(after_data, '$.reporter_id') = ?
       LIMIT 1`,
      [contentId, contentType, userId]
    );

    if (duplicateResult.rows.length > 0) {
      throw new Error('You have already reported this content');
    }

    // Log via AdminActivityService
    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: userId,
      targetEntityType: contentType,
      actionType: 'content_report',
      actionCategory: 'moderation',
      actionDescription: `User reported ${contentType}: ${content.title}`,
      targetEntityId: contentId,
      beforeData: null,
      afterData: {
        reason,
        details: details || null,
        reporter_id: userId,
        reporter_email: userEmail,
        content_title: content.title,
      },
    });

    return { reported: true };
  }

  /**
   * Check if a user has already reported a content item
   */
  async hasUserReported(
    userId: number,
    contentType: ContentType,
    contentId: number
  ): Promise<boolean> {
    const result = await this.db.query<{ id: number }>(
      `SELECT id FROM admin_activity
       WHERE action_type = 'content_report'
         AND target_entity_id = ?
         AND target_entity_type = ?
         AND JSON_EXTRACT(after_data, '$.reporter_id') = ?
       LIMIT 1`,
      [contentId, contentType, userId]
    );
    return result.rows.length > 0;
  }

  // ==========================================================================
  // Comments (Phase 3B — table exists, API routes come in Phase 3B)
  // ==========================================================================

  /**
   * Get paginated comments for a content item
   */
  async getComments(
    contentType: ContentType,
    contentId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ comments: ContentCommentWithUser[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const [commentsResult, countResult] = await Promise.all([
      this.db.query<ContentCommentWithUser>(
        `SELECT cc.id, cc.content_type, cc.content_id, cc.user_id, cc.parent_id,
                cc.comment_text, cc.status, cc.is_edited, cc.created_at, cc.updated_at,
                u.first_name, u.last_name, COALESCE(u.email, '') AS email, u.avatar_url
         FROM content_comments cc
         LEFT JOIN users u ON cc.user_id = u.id
         WHERE cc.content_type = ? AND cc.content_id = ? AND cc.status = 'active'
         ORDER BY cc.created_at ASC
         LIMIT ? OFFSET ?`,
        [contentType, contentId, pageSize, offset]
      ),
      this.db.query<{ total: bigint | number }>(
        `SELECT COUNT(*) AS total FROM content_comments
         WHERE content_type = ? AND content_id = ? AND status = 'active'`,
        [contentType, contentId]
      ),
    ]);

    const totalRow = countResult.rows[0];
    const total = totalRow ? bigIntToNumber(totalRow.total) : 0;

    return { comments: commentsResult.rows, total };
  }

  /**
   * Add a comment to a content item
   */
  async addComment(
    userId: number,
    contentType: ContentType,
    contentId: number,
    text: string,
    parentId?: number
  ): Promise<ContentComment> {
    const result = await this.db.query<{ insertId: number }>(
      `INSERT INTO content_comments
         (content_type, content_id, user_id, parent_id, comment_text)
       VALUES (?, ?, ?, ?, ?)`,
      [contentType, contentId, userId, parentId ?? null, text]
    );

    const insertId = (result as unknown as { insertId: number }).insertId;

    const fetchResult = await this.db.query<ContentComment>(
      'SELECT id, content_type, content_id, user_id, parent_id, comment_text, status, is_edited, created_at, updated_at FROM content_comments WHERE id = ?',
      [insertId]
    );

    const comment = fetchResult.rows[0];
    if (!comment) {
      throw new Error('Failed to retrieve newly created comment');
    }
    return comment;
  }

  /**
   * Soft-delete a comment (status = 'deleted').
   * Only the comment author can delete their own comment.
   */
  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    const result = await this.db.query<{ affectedRows: number }>(
      `UPDATE content_comments
       SET status = 'deleted'
       WHERE id = ? AND user_id = ? AND status = 'active'`,
      [commentId, userId]
    );

    const affected = (result as unknown as { affectedRows: number }).affectedRows ?? 0;
    return affected > 0;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: ContentInteractionService | null = null;

export function getContentInteractionService(): ContentInteractionService {
  if (!instance) {
    instance = new ContentInteractionService(getDatabaseService());
  }
  return instance;
}
