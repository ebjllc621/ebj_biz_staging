/**
 * TeamMemberService - Team Member Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - No tier limits for team members (unlimited for all tiers)
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 8 Brain Plan - Service Layer Implementation
 * @phase Phase 8 - Task 8.1: TeamMemberService Implementation
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { safeJsonParse } from '@core/utils/json';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface TeamMember {
  id: number;
  listing_id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string> | null;
  display_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTeamMemberInput {
  name: string;
  role?: string;
  bio?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  social_links?: Record<string, string>;
  display_order?: number;
  is_visible?: boolean;
}

export interface UpdateTeamMemberInput {
  name?: string;
  role?: string;
  bio?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  social_links?: Record<string, string>;
  display_order?: number;
  is_visible?: boolean;
}

interface TeamMemberRow {
  id: number;
  listing_id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  social_links: string | null;
  display_order: number;
  is_visible: number;
  created_at: Date | string;
  updated_at: Date | string;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class TeamMemberNotFoundError extends BizError {
  constructor(identifier: number | string) {
    super({
      code: 'TEAM_MEMBER_NOT_FOUND',
      message: `Team member not found: ${identifier}`,
      context: { identifier },
      userMessage: 'The requested team member was not found'
    });
  }
}

// ============================================================================
// TeamMemberService Implementation
// ============================================================================

export class TeamMemberService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get all team members for a listing
   * @param listingId Listing ID
   * @returns Array of team members ordered by display_order
   */
  async getByListingId(listingId: number): Promise<TeamMember[]> {
    const result: DbResult<TeamMemberRow> = await this.db.query(
      'SELECT * FROM listing_team_members WHERE listing_id = ? ORDER BY display_order ASC, created_at ASC',
      [listingId]
    );

    return result.rows.map((r) => this.mapRowToTeamMember(r));
  }

  /**
   * Get visible team members for a listing (public display)
   * @param listingId Listing ID
   * @returns Array of visible team members
   */
  async getVisibleByListingId(listingId: number): Promise<TeamMember[]> {
    const result: DbResult<TeamMemberRow> = await this.db.query(
      'SELECT * FROM listing_team_members WHERE listing_id = ? AND is_visible = 1 ORDER BY display_order ASC, created_at ASC',
      [listingId]
    );

    return result.rows.map((r) => this.mapRowToTeamMember(r));
  }

  /**
   * Get team member by ID
   * @param id Team member ID
   * @returns Team member or null if not found
   */
  async getById(id: number): Promise<TeamMember | null> {
    const result: DbResult<TeamMemberRow> = await this.db.query(
      'SELECT * FROM listing_team_members WHERE id = ?',
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return this.mapRowToTeamMember(row);
  }

  // ==========================================================================
  // WRITE Operations
  // ==========================================================================

  /**
   * Create a new team member
   * @param listingId Listing ID
   * @param data Team member data
   * @returns Created team member
   */
  async create(listingId: number, data: CreateTeamMemberInput): Promise<TeamMember> {
    // Get next display order if not specified
    let displayOrder = data.display_order;
    if (displayOrder === undefined) {
      const countResult: DbResult<{ count: number | bigint }> = await this.db.query(
        'SELECT COUNT(*) as count FROM listing_team_members WHERE listing_id = ?',
        [listingId]
      );
      const count = typeof countResult.rows[0]?.count === 'bigint'
        ? Number(countResult.rows[0].count)
        : (countResult.rows[0]?.count || 0);
      displayOrder = count;
    }

    // Insert team member
    const result: DbResult<TeamMemberRow> = await this.db.query(
      `INSERT INTO listing_team_members (
        listing_id, name, role, bio, photo_url, email, phone, social_links, display_order, is_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        listingId,
        data.name,
        data.role || null,
        data.bio || null,
        data.photo_url || null,
        data.email || null,
        data.phone || null,
        data.social_links ? JSON.stringify(data.social_links) : null,
        displayOrder,
        data.is_visible !== undefined ? (data.is_visible ? 1 : 0) : 1
      ]
    );

    if (!result.insertId) {
      throw BizError.databaseError(
        'create team member',
        new Error('No insert ID returned')
      );
    }

    const created = await this.getById(result.insertId);
    if (!created) {
      throw BizError.databaseError(
        'create team member',
        new Error('Failed to retrieve created team member')
      );
    }

    return created;
  }

  /**
   * Update a team member
   * @param id Team member ID
   * @param data Update data
   * @returns Updated team member
   */
  async update(id: number, data: UpdateTeamMemberInput): Promise<TeamMember> {
    // Check team member exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new TeamMemberNotFoundError(id);
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }

    if (data.bio !== undefined) {
      updates.push('bio = ?');
      params.push(data.bio);
    }

    if (data.photo_url !== undefined) {
      updates.push('photo_url = ?');
      params.push(data.photo_url);
    }

    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }

    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }

    if (data.social_links !== undefined) {
      updates.push('social_links = ?');
      params.push(data.social_links ? JSON.stringify(data.social_links) : null);
    }

    if (data.display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(data.display_order);
    }

    if (data.is_visible !== undefined) {
      updates.push('is_visible = ?');
      params.push(data.is_visible ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing; // No changes
    }

    params.push(id);

    await this.db.query(
      `UPDATE listing_team_members SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updated = await this.getById(id);
    if (!updated) {
      throw BizError.databaseError(
        'update team member',
        new Error('Failed to retrieve updated team member')
      );
    }

    return updated;
  }

  /**
   * Delete a team member
   * @param id Team member ID
   */
  async delete(id: number): Promise<void> {
    const member = await this.getById(id);
    if (!member) {
      throw new TeamMemberNotFoundError(id);
    }

    await this.db.query('DELETE FROM listing_team_members WHERE id = ?', [id]);

    // Reorder remaining members to close the gap
    await this.reorderMembers(member.listing_id);
  }

  /**
   * Reorder team members for a listing
   * @param listingId Listing ID
   * @param memberIds Array of member IDs in new order
   */
  async reorder(listingId: number, memberIds: number[]): Promise<void> {
    // Use transaction to ensure consistency
    await this.db.transaction(async (client) => {
      for (let i = 0; i < memberIds.length; i++) {
        await client.query(
          'UPDATE listing_team_members SET display_order = ? WHERE id = ? AND listing_id = ?',
          [i, memberIds[i], listingId]
        );
      }
    });
  }

  // ==========================================================================
  // UTILITY Operations
  // ==========================================================================

  /**
   * Reorder members after deletion to close gaps
   * @param listingId Listing ID
   */
  private async reorderMembers(listingId: number): Promise<void> {
    const members = await this.getByListingId(listingId);
    const memberIds = members.map(m => m.id);
    if (memberIds.length > 0) {
      await this.reorder(listingId, memberIds);
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Map database row to TeamMember interface
   */
  private mapRowToTeamMember(row: TeamMemberRow): TeamMember {
    return {
      id: row.id,
      listing_id: row.listing_id,
      name: row.name,
      role: row.role || null,
      bio: row.bio || null,
      photo_url: row.photo_url || null,
      email: row.email || null,
      phone: row.phone || null,
      social_links: row.social_links ? safeJsonParse<Record<string, string>>(row.social_links) : null,
      display_order: row.display_order,
      is_visible: Boolean(row.is_visible),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
