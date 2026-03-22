/**
 * ContactService - Personal CRM Contact Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Service pattern: Wraps ConnectionService for contact-specific logic
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_B_CRM_FEATURES_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/services/ConnectionService.ts - Service pattern
 *
 * Phase A: Core contacts display from user_connection
 * Phase B: CRM features with user_contacts table
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ConnectionService } from '@features/connections/services/ConnectionService';
import { safeJsonParse } from '@core/utils/bigint';
import type { Contact, UpdateContactInput, ContactFilters, CreateManualContactInput, ContactCategory, ImportRowData, ImportMatchResults, ImportMatchResult } from '../types';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import { ContactMatchService } from './ContactMatchService';
import { ReferralService, DuplicateReferralError } from './ReferralService';
import type { BatchMatchResult, ContactMatchResult } from '../types/matching';

/**
 * ContactService Implementation
 * Phase A: Contacts = Connections with enhanced display
 * Phase B: Contacts + Personal CRM data (notes, tags, reminders)
 */
export class ContactService {
  private db: DatabaseService;
  private connectionService: ConnectionService;

  constructor(db: DatabaseService) {
    this.db = db;
    this.connectionService = new ConnectionService(db);
  }

  /**
   * Get all contacts for a user with CRM data
   * Phase A: From user_connection
   * Phase B: LEFT JOIN user_contacts for CRM fields
   * Phase C: UNION with manual contacts
   *
   * @param userId User ID
   * @param filters Optional filters (Phase B+C)
   * @returns Array of contacts with CRM data
   */
  async getContacts(userId: number, filters?: ContactFilters): Promise<Contact[]> {
    // Phase C: Filter manual contacts only
    if (filters?.isManual === true) {
      return this.getManualContacts(userId, filters);
    }

    // Get connected contacts
    const query = `
      SELECT
        uc.id as connection_id,
        uc.sender_user_id,
        uc.receiver_user_id,
        uc.connection_type,
        uc.created_at as connected_since,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.id
          WHEN uc.receiver_user_id = ? THEN u1.id
        END as user_id,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.username
          WHEN uc.receiver_user_id = ? THEN u1.username
        END as username,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.display_name
          WHEN uc.receiver_user_id = ? THEN u1.display_name
        END as display_name,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.avatar_url
          WHEN uc.receiver_user_id = ? THEN u1.avatar_url
        END as avatar_url,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.avatar_bg_color
          WHEN uc.receiver_user_id = ? THEN u1.avatar_bg_color
        END as avatar_bg_color,
        0 as mutual_connections,
        0 as interaction_count,
        NULL as last_interaction,
        -- Phase B: CRM fields from user_contacts
        uct.id as crm_id,
        uct.notes,
        uct.tags,
        uct.category,
        uct.priority,
        uct.follow_up_date,
        uct.follow_up_note,
        uct.last_contacted_at,
        COALESCE(uct.is_starred, FALSE) as is_starred,
        COALESCE(uct.is_archived, FALSE) as is_archived,
        -- Phase C: Source fields
        COALESCE(uct.source, 'connection') as source,
        uct.source_details,
        NULL as contact_name,
        NULL as contact_email,
        NULL as contact_phone,
        NULL as contact_company,
        NULL as contact_address,
        NULL as contact_social_links
      FROM user_connection uc
      INNER JOIN users u1 ON uc.sender_user_id = u1.id
      INNER JOIN users u2 ON uc.receiver_user_id = u2.id
      LEFT JOIN user_contacts uct ON (
        uct.user_id = ? AND
        uct.contact_user_id = CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id
          WHEN uc.receiver_user_id = ? THEN uc.sender_user_id
        END
      )
      WHERE (uc.sender_user_id = ? OR uc.receiver_user_id = ?)
        AND uc.status = 'connected'
        ${filters?.category ? 'AND uct.category = ?' : ''}
        ${filters?.isStarred ? 'AND uct.is_starred = TRUE' : ''}
        ${filters?.hasReminder ? 'AND uct.follow_up_date IS NOT NULL' : ''}
        ${filters?.isArchived === false ? 'AND COALESCE(uct.is_archived, FALSE) = FALSE' : ''}
      ORDER BY uc.created_at DESC
    `;

    const params: any[] = [
      userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, // For CASE statements (5 CASE statements x 2)
      userId, userId, userId, // For LEFT JOIN
      userId, userId // For WHERE
    ];

    if (filters?.category) {
      params.push(filters.category);
    }

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    const connectedContacts = rows.map((row: RowDataPacket) => ({
      id: row.crm_id || row.connection_id,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color || null,
      connection_type: row.connection_type,
      connected_since: new Date(row.connected_since),
      mutual_connections: row.mutual_connections,
      interaction_count: row.interaction_count,
      last_interaction: row.last_interaction ? new Date(row.last_interaction) : null,
      is_connected: true,
      // Phase C: Manual contact fields (null for connected contacts)
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      contact_company: null,
      contact_address: null,
      contact_social_links: null,
      source: row.source || 'connection',
      source_details: row.source_details || null,
      // Phase B: CRM fields
      notes: row.notes || null,
      tags: safeJsonParse(row.tags, null),
      category: row.category || null,
      priority: row.priority || null,
      follow_up_date: row.follow_up_date ? new Date(row.follow_up_date) : null,
      follow_up_note: row.follow_up_note || null,
      last_contacted_at: row.last_contacted_at ? new Date(row.last_contacted_at) : null,
      is_starred: Boolean(row.is_starred),
      is_archived: Boolean(row.is_archived)
    }));

    // Phase C: Return connected contacts only if filtered
    if (filters?.isManual === false) {
      return connectedContacts;
    }

    // Phase C: Include both connected and manual contacts
    const manualContacts = await this.getManualContacts(userId, filters);
    return [...connectedContacts, ...manualContacts];
  }

  /**
   * Get a single contact with CRM data
   *
   * @param userId Owner user ID
   * @param contactUserId Contact's user ID
   * @returns Contact or null
   */
  async getContactWithCRM(userId: number, contactUserId: number): Promise<Contact | null> {
    const contacts = await this.getContacts(userId);
    return contacts.find(c => c.user_id === contactUserId) || null;
  }

  /**
   * Update contact CRM fields (upsert into user_contacts)
   *
   * @param userId Owner user ID
   * @param contactUserId Contact's user ID
   * @param input CRM fields to update
   * @returns Updated contact
   */
  async updateContact(
    userId: number,
    contactUserId: number,
    input: UpdateContactInput
  ): Promise<Contact> {
    // First, get connection_id if exists
    const connectionQuery = `
      SELECT id FROM user_connection
      WHERE ((sender_user_id = ? AND receiver_user_id = ?) OR (sender_user_id = ? AND receiver_user_id = ?))
        AND status = 'connected'
      LIMIT 1
    `;
    const connResult = await this.db.query<RowDataPacket>(
      connectionQuery,
      [userId, contactUserId, contactUserId, userId]
    );
    const connectionId = connResult.rows[0]?.id || null;

    // Upsert into user_contacts
    const upsertQuery = `
      INSERT INTO user_contacts (
        user_id, contact_user_id, connection_id,
        notes, tags, category, priority,
        follow_up_date, follow_up_note, last_contacted_at,
        is_starred, is_archived
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        notes = VALUES(notes),
        tags = VALUES(tags),
        category = VALUES(category),
        priority = VALUES(priority),
        follow_up_date = VALUES(follow_up_date),
        follow_up_note = VALUES(follow_up_note),
        last_contacted_at = VALUES(last_contacted_at),
        is_starred = VALUES(is_starred),
        is_archived = VALUES(is_archived),
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.db.query(upsertQuery, [
      userId,
      contactUserId,
      connectionId,
      input.notes !== undefined ? input.notes : null,
      input.tags !== undefined ? JSON.stringify(input.tags) : null,
      input.category !== undefined ? input.category : null,
      input.priority !== undefined ? input.priority : null,
      input.follow_up_date !== undefined ? input.follow_up_date : null,
      input.follow_up_note !== undefined ? input.follow_up_note : null,
      input.last_contacted_at !== undefined ? input.last_contacted_at : null,
      input.is_starred !== undefined ? input.is_starred : false,
      input.is_archived !== undefined ? input.is_archived : false
    ]);

    // Return updated contact
    const updated = await this.getContactWithCRM(userId, contactUserId);
    if (!updated) {
      throw new Error('Failed to retrieve updated contact');
    }
    return updated;
  }

  /**
   * Toggle starred status for a contact
   *
   * @param userId Owner user ID
   * @param contactUserId Contact's user ID
   * @returns New starred status
   */
  async toggleStar(userId: number, contactUserId: number): Promise<boolean> {
    // Get current status
    const current = await this.getContactWithCRM(userId, contactUserId);
    const newStatus = !current?.is_starred;

    // Update
    await this.updateContact(userId, contactUserId, { is_starred: newStatus });
    return newStatus;
  }

  /**
   * Get all unique tags used by a user
   *
   * @param userId User ID
   * @returns Array of unique tags
   */
  async getUserTags(userId: number): Promise<string[]> {
    const query = `
      SELECT DISTINCT tags
      FROM user_contacts
      WHERE user_id = ? AND tags IS NOT NULL
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    const allTags: string[] = [];
    rows.forEach(row => {
      if (row.tags) {
        const tags = safeJsonParse(row.tags, []);
        if (Array.isArray(tags)) {
          allTags.push(...tags);
        }
      }
    });

    // Deduplicate and sort
    return Array.from(new Set(allTags)).sort();
  }

  /**
   * Get contacts with upcoming follow-up reminders
   *
   * @param userId User ID
   * @param daysAhead Number of days to look ahead (default: 7)
   * @returns Contacts with reminders
   */
  async getUpcomingReminders(userId: number, daysAhead: number = 7): Promise<Contact[]> {
    const query = `
      SELECT
        uc.id as connection_id,
        uc.sender_user_id,
        uc.receiver_user_id,
        uc.connection_type,
        uc.created_at as connected_since,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.id
          WHEN uc.receiver_user_id = ? THEN u1.id
        END as user_id,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.username
          WHEN uc.receiver_user_id = ? THEN u1.username
        END as username,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.display_name
          WHEN uc.receiver_user_id = ? THEN u1.display_name
        END as display_name,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.avatar_url
          WHEN uc.receiver_user_id = ? THEN u1.avatar_url
        END as avatar_url,
        CASE
          WHEN uc.sender_user_id = ? THEN u2.avatar_bg_color
          WHEN uc.receiver_user_id = ? THEN u1.avatar_bg_color
        END as avatar_bg_color,
        0 as mutual_connections,
        0 as interaction_count,
        NULL as last_interaction,
        uct.id as crm_id,
        uct.notes,
        uct.tags,
        uct.category,
        uct.priority,
        uct.follow_up_date,
        uct.follow_up_note,
        uct.last_contacted_at,
        uct.is_starred,
        uct.is_archived
      FROM user_contacts uct
      INNER JOIN user_connection uc ON (
        (uc.sender_user_id = uct.user_id AND uc.receiver_user_id = uct.contact_user_id) OR
        (uc.receiver_user_id = uct.user_id AND uc.sender_user_id = uct.contact_user_id)
      )
      INNER JOIN users u1 ON uc.sender_user_id = u1.id
      INNER JOIN users u2 ON uc.receiver_user_id = u2.id
      WHERE uct.user_id = ?
        AND uct.follow_up_date IS NOT NULL
        AND uct.follow_up_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY uct.follow_up_date ASC
    `;

    const result = await this.db.query<RowDataPacket>(query, [
      userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, // CASE statements (5 CASE statements x 2)
      userId, daysAhead
    ]);
    const rows = result.rows || [];

    return rows.map((row: RowDataPacket) => ({
      id: row.crm_id || row.connection_id,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color || null,
      connection_type: row.connection_type,
      connected_since: new Date(row.connected_since),
      mutual_connections: row.mutual_connections,
      interaction_count: row.interaction_count,
      last_interaction: row.last_interaction ? new Date(row.last_interaction) : null,
      is_connected: true,
      // Phase C: Manual contact fields (null for connected contacts)
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      contact_company: null,
      contact_address: null,
      contact_social_links: null,
      source: 'connection' as const,
      source_details: null,
      notes: row.notes || null,
      tags: safeJsonParse(row.tags, null),
      category: row.category || null,
      priority: row.priority || null,
      follow_up_date: row.follow_up_date ? new Date(row.follow_up_date) : null,
      follow_up_note: row.follow_up_note || null,
      last_contacted_at: row.last_contacted_at ? new Date(row.last_contacted_at) : null,
      is_starred: Boolean(row.is_starred),
      is_archived: Boolean(row.is_archived)
    }));
  }

  /**
   * Archive a contact
   *
   * @param userId Owner user ID
   * @param contactUserId Contact's user ID
   */
  async archiveContact(userId: number, contactUserId: number): Promise<void> {
    await this.updateContact(userId, contactUserId, { is_archived: true });
  }

  // ==================== PHASE C: MANUAL CONTACT METHODS ====================

  /**
   * Create a manual contact (not tied to a user)
   *
   * @param userId Owner user ID
   * @param input Manual contact input
   * @returns Created contact
   */
  async createManualContact(
    userId: number,
    input: CreateManualContactInput
  ): Promise<Contact> {
    // Validate required fields
    if (!input.name?.trim()) {
      throw new Error('Contact name is required');
    }

    if (input.source === 'connection') {
      throw new Error('Use syncFromConnection for connection contacts');
    }

    // Check for duplicate (same name + email)
    if (input.email) {
      const existing = await this.findManualContactByEmail(userId, input.email);
      if (existing) {
        throw new Error('A contact with this email already exists');
      }
    }

    const query = `
      INSERT INTO user_contacts (
        user_id, contact_user_id, connection_id,
        contact_name, contact_email, contact_phone, contact_company,
        contact_address, contact_social_links,
        source, source_details,
        notes, tags, category, priority,
        follow_up_date, follow_up_note,
        is_starred, is_archived
      ) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE)
    `;

    const result = await this.db.query(query, [
      userId,
      input.name.trim(),
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.company?.trim() || null,
      input.address?.trim() || null,
      input.social_links ? JSON.stringify(input.social_links) : null,
      input.source,
      input.source_details?.trim() || null,
      input.notes?.trim() || null,
      input.tags ? JSON.stringify(input.tags) : null,
      input.category || null,
      input.priority || null,
      input.follow_up_date || null,
      input.follow_up_note?.trim() || null
    ]);

    // Get and return the created contact
    const insertId = (result as any).insertId;
    const createdContact = await this.getManualContactById(userId, insertId);
    if (!createdContact) {
      throw new Error('Failed to retrieve created contact');
    }
    return createdContact;
  }

  /**
   * Get a manual contact by ID
   *
   * @param userId Owner user ID
   * @param contactId Contact ID
   * @returns Contact or null
   */
  async getManualContactById(userId: number, contactId: number): Promise<Contact | null> {
    const query = `
      SELECT
        uc.id,
        uc.user_id,
        uc.contact_user_id,
        uc.connection_id,
        uc.contact_name,
        uc.contact_email,
        uc.contact_phone,
        uc.contact_company,
        uc.contact_address,
        uc.contact_social_links,
        uc.source,
        uc.source_details,
        uc.notes,
        uc.tags,
        uc.category,
        uc.priority,
        uc.follow_up_date,
        uc.follow_up_note,
        uc.last_contacted_at,
        uc.is_starred,
        uc.is_archived,
        uc.created_at
      FROM user_contacts uc
      WHERE uc.id = ? AND uc.user_id = ? AND uc.contact_user_id IS NULL
    `;

    const result = await this.db.query<RowDataPacket>(query, [contactId, userId]);
    const rows = result.rows || [];

    if (rows.length === 0) return null;

    const row = rows[0] as RowDataPacket;
    return this.mapManualContactRow(row);
  }

  /**
   * Find manual contact by email (for duplicate detection)
   */
  async findManualContactByEmail(userId: number, email: string): Promise<Contact | null> {
    const query = `
      SELECT id FROM user_contacts
      WHERE user_id = ? AND contact_email = ? AND contact_user_id IS NULL
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId, email.toLowerCase().trim()]);
    const rows = result.rows || [];

    if (rows.length === 0) return null;
    return this.getManualContactById(userId, (rows[0] as RowDataPacket).id);
  }

  /**
   * Delete a manual contact (only manual contacts can be deleted)
   *
   * @param userId Owner user ID
   * @param contactId Contact ID
   */
  async deleteManualContact(userId: number, contactId: number): Promise<void> {
    // Verify it's a manual contact
    const contact = await this.getManualContactById(userId, contactId);
    if (!contact) {
      throw new Error('Manual contact not found');
    }

    const query = `
      DELETE FROM user_contacts
      WHERE id = ? AND user_id = ? AND contact_user_id IS NULL
    `;

    await this.db.query(query, [contactId, userId]);
  }

  /**
   * Update a manual contact
   *
   * @param userId Owner user ID
   * @param contactId Contact ID
   * @param input Fields to update
   */
  async updateManualContact(
    userId: number,
    contactId: number,
    input: Partial<CreateManualContactInput> & UpdateContactInput
  ): Promise<Contact> {
    // Verify it's a manual contact
    const existing = await this.getManualContactById(userId, contactId);
    if (!existing) {
      throw new Error('Manual contact not found');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('contact_name = ?');
      params.push(input.name.trim());
    }
    if (input.email !== undefined) {
      updates.push('contact_email = ?');
      params.push(input.email?.trim() || null);
    }
    if (input.phone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(input.phone?.trim() || null);
    }
    if (input.company !== undefined) {
      updates.push('contact_company = ?');
      params.push(input.company?.trim() || null);
    }
    if (input.contact_email !== undefined) {
      updates.push('contact_email = ?');
      params.push(input.contact_email?.trim() || null);
    }
    if (input.contact_phone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(input.contact_phone?.trim() || null);
    }
    if (input.contact_company !== undefined) {
      updates.push('contact_company = ?');
      params.push(input.contact_company?.trim() || null);
    }
    if (input.contact_address !== undefined) {
      updates.push('contact_address = ?');
      params.push(input.contact_address?.trim() || null);
    }
    if (input.contact_social_links !== undefined) {
      updates.push('contact_social_links = ?');
      params.push(input.contact_social_links ? JSON.stringify(input.contact_social_links) : null);
    }
    if (input.source !== undefined && input.source !== 'connection') {
      updates.push('source = ?');
      params.push(input.source);
    }
    if (input.source_details !== undefined) {
      updates.push('source_details = ?');
      params.push(input.source_details?.trim() || null);
    }
    // CRM fields (same as updateContact)
    if (input.notes !== undefined) {
      updates.push('notes = ?');
      params.push(input.notes);
    }
    if (input.tags !== undefined) {
      updates.push('tags = ?');
      params.push(input.tags ? JSON.stringify(input.tags) : null);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.follow_up_date !== undefined) {
      updates.push('follow_up_date = ?');
      params.push(input.follow_up_date);
    }
    if (input.follow_up_note !== undefined) {
      updates.push('follow_up_note = ?');
      params.push(input.follow_up_note);
    }
    if (input.is_starred !== undefined) {
      updates.push('is_starred = ?');
      params.push(input.is_starred);
    }
    if (input.is_archived !== undefined) {
      updates.push('is_archived = ?');
      params.push(input.is_archived);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(contactId, userId);

    const query = `
      UPDATE user_contacts
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ? AND contact_user_id IS NULL
    `;

    await this.db.query(query, params);
    return this.getManualContactById(userId, contactId) as Promise<Contact>;
  }

  /**
   * Get all manual contacts (for listing)
   *
   * @param userId Owner user ID
   * @param filters Optional filters
   */
  async getManualContacts(userId: number, filters?: ContactFilters): Promise<Contact[]> {
    let query = `
      SELECT
        uc.id,
        uc.user_id,
        uc.contact_user_id,
        uc.connection_id,
        uc.contact_name,
        uc.contact_email,
        uc.contact_phone,
        uc.contact_company,
        uc.contact_address,
        uc.contact_social_links,
        uc.source,
        uc.source_details,
        uc.notes,
        uc.tags,
        uc.category,
        uc.priority,
        uc.follow_up_date,
        uc.follow_up_note,
        uc.last_contacted_at,
        uc.is_starred,
        uc.is_archived,
        uc.created_at
      FROM user_contacts uc
      WHERE uc.user_id = ? AND uc.contact_user_id IS NULL
        ${filters?.category ? 'AND uc.category = ?' : ''}
        ${filters?.source ? 'AND uc.source = ?' : ''}
        ${filters?.isStarred ? 'AND uc.is_starred = TRUE' : ''}
        ${filters?.hasReminder ? 'AND uc.follow_up_date IS NOT NULL' : ''}
        ${filters?.isArchived === false ? 'AND COALESCE(uc.is_archived, FALSE) = FALSE' : ''}
      ORDER BY uc.created_at DESC
    `;

    const params: any[] = [userId];
    if (filters?.category) params.push(filters.category);
    if (filters?.source) params.push(filters.source);

    const result = await this.db.query<RowDataPacket>(query, params);
    const rows = result.rows || [];

    return rows.map((row: RowDataPacket) => this.mapManualContactRow(row));
  }

  /**
   * Helper: Map database row to manual Contact object
   */
  private mapManualContactRow(row: RowDataPacket): Contact {
    return {
      id: row.id,
      user_id: row.id, // Use contact ID as identifier for manual contacts
      username: row.contact_email || `contact-${row.id}`, // Generated identifier
      display_name: row.contact_name,
      avatar_url: null, // Manual contacts don't have avatars
      avatar_bg_color: null, // Manual contacts don't have user-selected colors
      connection_type: null,
      connected_since: new Date(row.created_at),
      mutual_connections: 0,
      interaction_count: 0,
      last_interaction: row.last_contacted_at ? new Date(row.last_contacted_at) : null,
      is_connected: false, // Manual contacts are NOT connections
      // Phase C fields
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      contact_company: row.contact_company,
      contact_address: row.contact_address || null,
      contact_social_links: safeJsonParse(row.contact_social_links, null),
      source: row.source || 'manual',
      source_details: row.source_details,
      // Phase B CRM fields
      notes: row.notes || null,
      tags: safeJsonParse(row.tags, null),
      category: row.category || null,
      priority: row.priority || null,
      follow_up_date: row.follow_up_date ? new Date(row.follow_up_date) : null,
      follow_up_note: row.follow_up_note || null,
      last_contacted_at: row.last_contacted_at ? new Date(row.last_contacted_at) : null,
      is_starred: Boolean(row.is_starred),
      is_archived: Boolean(row.is_archived)
    };
  }

  // ==================== CONNECTION SYNC METHODS ====================

  /**
   * Sync a connection to contacts
   * Creates a user_contacts entry when a connection is accepted
   * This enables CRM features for the new connection immediately
   *
   * @param userId User ID who will own the contact entry
   * @param connectionId The connection ID from user_connection
   * @param contactUserId The other user's ID (the new contact)
   * @returns Created contact entry or null if already exists
   */
  async syncFromConnection(
    userId: number,
    connectionId: number,
    contactUserId: number
  ): Promise<Contact | null> {
    // Check if contact entry already exists
    const existingQuery = `
      SELECT id FROM user_contacts
      WHERE user_id = ? AND contact_user_id = ?
      LIMIT 1
    `;
    const existingResult = await this.db.query<RowDataPacket>(existingQuery, [userId, contactUserId]);
    const existingRows = existingResult.rows || [];

    if (existingRows.length > 0) {
      // Contact already exists, just ensure connection_id is set
      await this.db.query(
        `UPDATE user_contacts SET connection_id = ? WHERE user_id = ? AND contact_user_id = ?`,
        [connectionId, userId, contactUserId]
      );
      return this.getContactWithCRM(userId, contactUserId);
    }

    // Create new contact entry for this connection
    const insertQuery = `
      INSERT INTO user_contacts (
        user_id, contact_user_id, connection_id,
        source, is_starred, is_archived
      ) VALUES (?, ?, ?, 'connection', FALSE, FALSE)
    `;

    await this.db.query(insertQuery, [userId, contactUserId, connectionId]);

    // Return the created contact
    return this.getContactWithCRM(userId, contactUserId);
  }

  /**
   * Handle connection removed event
   * Marks the contact as disconnected but preserves CRM data
   *
   * @param userId User ID who owns the contact entry
   * @param contactUserId The disconnected user's ID
   */
  async handleConnectionRemoved(userId: number, contactUserId: number): Promise<void> {
    // Clear the connection_id but keep the contact entry with CRM data
    const query = `
      UPDATE user_contacts
      SET connection_id = NULL, source = 'manual', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND contact_user_id = ?
    `;

    await this.db.query(query, [userId, contactUserId]);
  }

  // ==================== PHASE D: IMPORT/EXPORT METHODS ====================

  /**
   * Preview import data without saving
   * Validates rows, detects duplicates
   *
   * @param userId Owner user ID
   * @param rows Parsed import rows
   * @returns Import preview with validation results
   */
  async previewImport(userId: number, rows: ImportRowData[]): Promise<import('../types').ImportPreview> {
    const previewRows: import('../types').ImportPreviewRow[] = [];
    let validRows = 0;
    let invalidRows = 0;
    let duplicates = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const errors: string[] = [];

      // Validate required fields
      if (!row.name?.trim()) {
        errors.push('Name is required');
      }

      // Validate email format if provided
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Invalid email format');
      }

      // Validate category if provided
      if (row.category && !['client', 'partner', 'lead', 'friend', 'other'].includes(row.category.toLowerCase())) {
        errors.push('Invalid category (must be: client, partner, lead, friend, other)');
      }

      // Check for duplicate by email
      let existingContactId: number | undefined;
      let status: 'valid' | 'invalid' | 'duplicate' = 'valid';

      if (row.email) {
        const existing = await this.findManualContactByEmail(userId, row.email);
        if (existing) {
          existingContactId = existing.id;
          status = 'duplicate';
          duplicates++;
        }
      }

      if (errors.length > 0) {
        status = 'invalid';
        invalidRows++;
      } else if (status !== 'duplicate') {
        validRows++;
      }

      previewRows.push({
        rowNumber: i + 1,
        data: row,
        status,
        errors,
        existingContactId
      });
    }

    return {
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicates,
      rows: previewRows
    };
  }

  /**
   * Import contacts from parsed data
   * Creates manual contacts with source='import'
   *
   * @param userId Owner user ID
   * @param rows Validated import rows
   * @param options Import options (skip duplicates, etc.)
   * @returns Import result summary
   */
  async importContacts(
    userId: number,
    rows: ImportRowData[],
    options: { skipDuplicates: boolean; sourceDetails?: string }
  ): Promise<import('../types').ImportResult> {
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: import('../types').ImportError[] = [];

    // Phase 5: Track newly created contact IDs for matching
    const importedContactIds: number[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) {
        skipped++;
        continue;
      }

      try {
        // Skip invalid rows
        if (!row.name?.trim()) {
          skipped++;
          errors.push({ rowNumber: i + 1, field: 'name', message: 'Name is required' });
          continue;
        }

        // Check for duplicate
        if (row.email) {
          const existing = await this.findManualContactByEmail(userId, row.email);
          if (existing) {
            duplicates++;
            if (options.skipDuplicates) {
              continue;
            }
            // Update existing contact instead
            await this.updateManualContact(userId, existing.id, {
              name: row.name,
              phone: row.phone,
              company: row.company,
              notes: row.notes,
              tags: row.tags ? row.tags.split(',').map(t => t.trim()) : undefined,
              category: row.category as ContactCategory || undefined
            });
            imported++;
            // Track updated contact for matching too
            importedContactIds.push(existing.id);
            continue;
          }
        }

        // Create new contact
        const created = await this.createManualContact(userId, {
          name: row.name.trim(),
          email: row.email?.trim(),
          phone: row.phone?.trim(),
          company: row.company?.trim(),
          source: 'import',
          source_details: options.sourceDetails || 'CSV Import',
          notes: row.notes?.trim(),
          tags: row.tags ? row.tags.split(',').map(t => t.trim()) : undefined,
          category: row.category as ContactCategory || undefined
        });

        imported++;
        // Phase 5: Track created contact ID for matching
        importedContactIds.push(created.id);
      } catch (error) {
        skipped++;
        errors.push({
          rowNumber: i + 1,
          field: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Phase 5: Run batch matching on imported contacts
    let matchResults: ImportMatchResults | undefined;
    console.log('[ContactService] Import complete. Imported contact IDs:', importedContactIds);

    if (importedContactIds.length > 0) {
      try {
        console.log('[ContactService] Starting batch matching for', importedContactIds.length, 'contacts');
        matchResults = await this.matchImportedContacts(userId, importedContactIds);
        console.log('[ContactService] Match results:', JSON.stringify(matchResults, null, 2));
      } catch (error) {
        // Log but don't fail the import if matching fails
        console.error('[ContactService] Import matching failed:', error);
      }
    } else {
      console.log('[ContactService] No contacts to match (importedContactIds is empty)');
    }

    console.log('[ContactService] Returning import result with matchResults:', !!matchResults);
    return { imported, skipped, duplicates, errors, matchResults };
  }

  /**
   * Match imported contacts against Bizconekt users
   * Phase 5: Contact-to-User Matching Integration
   *
   * @param userId Owner user ID
   * @param contactIds IDs of imported contacts to match
   * @returns Match results summary
   */
  private async matchImportedContacts(
    userId: number,
    contactIds: number[]
  ): Promise<ImportMatchResults> {
    const matchService = new ContactMatchService(this.db);

    // Get the imported contacts
    const contacts: Contact[] = [];
    for (const id of contactIds) {
      const contact = await this.getManualContactById(userId, id);
      console.log(`[ContactService] getManualContactById(${id}):`, contact ? {
        id: contact.id,
        contact_name: contact.contact_name,
        contact_email: contact.contact_email,
        contact_phone: contact.contact_phone,
        is_connected: contact.is_connected
      } : 'NULL');
      if (contact) {
        contacts.push(contact);
      }
    }

    console.log('[ContactService] Contacts to match:', contacts.length);

    // Run batch matching
    const batchResult = await matchService.batchMatchContacts(userId, contacts);
    console.log('[ContactService] Batch match result - total:', batchResult.total, 'matched:', batchResult.matched);

    // Format results
    return this.formatMatchResults(batchResult, contacts);
  }

  /**
   * Format batch match results for import response
   * Phase 5: Contact-to-User Matching Integration
   */
  private formatMatchResults(
    batchResult: BatchMatchResult,
    contacts: Contact[]
  ): ImportMatchResults {
    const matches: ImportMatchResult[] = [];
    let highConfidence = 0;
    let mediumConfidence = 0;

    batchResult.results.forEach((result: ContactMatchResult, contactId: number) => {
      if (!result.isMatched || !result.matchedUser) return;

      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;

      const confidence = result.confidence === 'high' ? 'high' : 'medium';
      if (confidence === 'high') {
        highConfidence++;
      } else {
        mediumConfidence++;
      }

      matches.push({
        contactId,
        contactName: contact.contact_name || contact.display_name || 'Unknown',
        matchedUserId: result.matchedUserId!,
        matchedUser: {
          username: result.matchedUser.username,
          display_name: result.matchedUser.display_name,
          avatar_url: result.matchedUser.avatar_url,
          avatar_bg_color: result.matchedUser.avatar_bg_color
        },
        matchType: result.matchType as 'email' | 'phone' | 'name_company',
        confidence,
        isAlreadyConnected: result.matchedUser.isAlreadyConnected,
        hasPendingRequest: result.matchedUser.hasPendingRequest
      });
    });

    return {
      totalMatched: matches.length,
      highConfidence,
      mediumConfidence,
      matches
    };
  }

  /**
   * Export contacts to CSV format
   *
   * @param userId Owner user ID
   * @param options Export options (fields, filters)
   * @returns CSV string content
   */
  async exportContactsCSV(
    userId: number,
    options: import('../types').ExportOptions
  ): Promise<string> {
    // Get contacts with filters
    const contacts = await this.getContacts(userId, options.filters);

    // Filter by specific IDs if provided
    const filteredContacts = options.contactIds
      ? contacts.filter(c => options.contactIds?.includes(c.id))
      : contacts;

    // Build CSV header
    const headers = options.includeFields.map(field => {
      const headerMap: Record<import('../types').ExportField, string> = {
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        company: 'Company',
        notes: 'Notes',
        tags: 'Tags',
        category: 'Category',
        priority: 'Priority',
        follow_up_date: 'Follow Up Date',
        follow_up_note: 'Follow Up Note',
        source: 'Source',
        source_details: 'Source Details',
        is_starred: 'Starred',
        connected_since: 'Added Date'
      };
      return headerMap[field];
    });

    // Build CSV rows
    const rows = filteredContacts.map(contact => {
      return options.includeFields.map(field => {
        const value = this.getExportFieldValue(contact, field);
        // Escape CSV special characters
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
    });

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export contacts to vCard format
   *
   * @param userId Owner user ID
   * @param options Export options
   * @returns vCard string content
   */
  async exportContactsVCard(
    userId: number,
    options: import('../types').ExportOptions
  ): Promise<string> {
    // Get contacts with filters
    const contacts = await this.getContacts(userId, options.filters);

    // Filter by specific IDs if provided
    const filteredContacts = options.contactIds
      ? contacts.filter(c => options.contactIds?.includes(c.id))
      : contacts;

    // Build vCard entries
    const vcards = filteredContacts.map(contact => {
      const displayName = contact.is_connected
        ? contact.display_name || contact.username
        : contact.contact_name || 'Unknown';

      const email = contact.is_connected ? null : contact.contact_email;
      const phone = contact.is_connected ? null : contact.contact_phone;
      const company = contact.is_connected ? null : contact.contact_company;

      const lines: string[] = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${displayName}`,
        `N:${displayName};;;;`
      ];

      if (email) lines.push(`EMAIL:${email}`);
      if (phone) lines.push(`TEL:${phone}`);
      if (company) lines.push(`ORG:${company}`);
      if (contact.notes) lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);

      lines.push('END:VCARD');
      return lines.join('\r\n');
    });

    return vcards.join('\r\n');
  }

  /**
   * Helper: Get field value for export
   */
  private getExportFieldValue(contact: Contact, field: import('../types').ExportField): string | null {
    const displayName = contact.is_connected
      ? contact.display_name || contact.username
      : contact.contact_name || '';

    switch (field) {
      case 'name':
        return displayName;
      case 'email':
        return contact.contact_email;
      case 'phone':
        return contact.contact_phone;
      case 'company':
        return contact.contact_company;
      case 'notes':
        return contact.notes;
      case 'tags':
        return contact.tags?.join(', ') || '';
      case 'category':
        return contact.category;
      case 'priority':
        return contact.priority;
      case 'follow_up_date':
        return contact.follow_up_date?.toISOString().split('T')[0] || '';
      case 'follow_up_note':
        return contact.follow_up_note;
      case 'source':
        return contact.source;
      case 'source_details':
        return contact.source_details;
      case 'is_starred':
        return contact.is_starred ? 'Yes' : 'No';
      case 'connected_since':
        return contact.connected_since?.toISOString().split('T')[0] || '';
      default:
        return null;
    }
  }

  // ==================== PHASE E: ADVANCED FEATURES METHODS ====================

  /**
   * Get contacts by smart list criteria
   * Executes dynamic query based on SmartListCriteria
   *
   * @param userId Owner user ID
   * @param criteria Smart list criteria
   * @returns Matching contacts
   */
  async getContactsByCriteria(
    userId: number,
    criteria: import('../types').SmartListCriteria
  ): Promise<Contact[]> {
    // Start with base filters from ContactFilters
    const baseFilters: ContactFilters = {
      search: criteria.search,
      category: criteria.category,
      tags: criteria.tags,
      isStarred: criteria.isStarred,
      hasReminder: criteria.hasReminder,
      isArchived: criteria.isArchived,
      source: criteria.source,
      isManual: criteria.isManual
    };

    // Get base contacts
    let contacts = await this.getContacts(userId, baseFilters);

    // Apply advanced criteria
    if (criteria.noInteractionDays !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.noInteractionDays);
      contacts = contacts.filter(c =>
        !c.last_contacted_at || c.last_contacted_at < cutoffDate
      );
    }

    if (criteria.connectionDateWithin !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.connectionDateWithin);
      contacts = contacts.filter(c => c.connected_since >= cutoffDate);
    }

    if (criteria.reminderWithin !== undefined) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + criteria.reminderWithin);
      contacts = contacts.filter(c =>
        c.follow_up_date && c.follow_up_date <= futureDate
      );
    }

    if (criteria.reminderBefore) {
      const beforeDate = new Date(criteria.reminderBefore);
      contacts = contacts.filter(c =>
        c.follow_up_date && c.follow_up_date < beforeDate
      );
    }

    if (criteria.priorityIn?.length) {
      contacts = contacts.filter(c =>
        c.priority && criteria.priorityIn?.includes(c.priority)
      );
    }

    if (criteria.categoriesIn?.length) {
      contacts = contacts.filter(c =>
        c.category && criteria.categoriesIn?.includes(c.category)
      );
    }

    if (criteria.sourcesIn?.length) {
      contacts = contacts.filter(c =>
        criteria.sourcesIn?.includes(c.source)
      );
    }

    if (criteria.mustBeStarred) {
      contacts = contacts.filter(c => c.is_starred);
    }

    if (criteria.mustHaveNotes) {
      contacts = contacts.filter(c => c.notes && c.notes.trim().length > 0);
    }

    if (criteria.mustHaveEmail) {
      contacts = contacts.filter(c => c.contact_email && c.contact_email.trim().length > 0);
    }

    return contacts;
  }

  /**
   * Get user's saved smart lists
   *
   * @param userId Owner user ID
   * @returns Array of smart lists
   */
  async getSmartLists(userId: number): Promise<import('../types').SmartList[]> {
    const query = `
      SELECT
        id, user_id, name, description, criteria, icon, color,
        contact_count, is_system, created_at, updated_at
      FROM user_smart_lists
      WHERE user_id = ?
      ORDER BY is_system DESC, name ASC
    `;

    const result = await this.db.query<RowDataPacket>(query, [userId]);
    const rows = result.rows || [];

    return rows.map((row: RowDataPacket) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      criteria: safeJsonParse(row.criteria, {}),
      icon: row.icon,
      color: row.color,
      contact_count: row.contact_count,
      is_system: Boolean(row.is_system),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  }

  /**
   * Create a new smart list
   *
   * @param userId Owner user ID
   * @param input Smart list input
   * @returns Created smart list
   */
  async createSmartList(
    userId: number,
    input: import('../types').CreateSmartListInput
  ): Promise<import('../types').SmartList> {
    // Calculate initial contact count
    const contacts = await this.getContactsByCriteria(userId, input.criteria);
    const contactCount = contacts.length;

    const query = `
      INSERT INTO user_smart_lists (
        user_id, name, description, criteria, icon, color,
        contact_count, is_system
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
    `;

    const result = await this.db.query(query, [
      userId,
      input.name,
      input.description || null,
      JSON.stringify(input.criteria),
      input.icon || 'List',
      input.color || 'blue',
      contactCount
    ]);

    const insertId = (result as any).insertId;
    const smartLists = await this.getSmartLists(userId);
    const created = smartLists.find(sl => sl.id === insertId);

    if (!created) {
      throw new Error('Failed to retrieve created smart list');
    }

    return created;
  }

  /**
   * Update a smart list
   *
   * @param userId Owner user ID
   * @param listId Smart list ID
   * @param input Updated fields
   * @returns Updated smart list
   */
  async updateSmartList(
    userId: number,
    listId: number,
    input: Partial<import('../types').CreateSmartListInput>
  ): Promise<import('../types').SmartList> {
    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }

    if (input.criteria !== undefined) {
      updates.push('criteria = ?');
      params.push(JSON.stringify(input.criteria));

      // Recalculate contact count
      const contacts = await this.getContactsByCriteria(userId, input.criteria);
      updates.push('contact_count = ?');
      params.push(contacts.length);
    }

    if (input.icon !== undefined) {
      updates.push('icon = ?');
      params.push(input.icon);
    }

    if (input.color !== undefined) {
      updates.push('color = ?');
      params.push(input.color);
    }

    if (updates.length === 0) {
      const smartLists = await this.getSmartLists(userId);
      const existing = smartLists.find(sl => sl.id === listId);
      if (!existing) throw new Error('Smart list not found');
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(listId, userId);

    const query = `
      UPDATE user_smart_lists
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ? AND is_system = FALSE
    `;

    await this.db.query(query, params);

    const smartLists = await this.getSmartLists(userId);
    const updated = smartLists.find(sl => sl.id === listId);

    if (!updated) {
      throw new Error('Smart list not found after update');
    }

    return updated;
  }

  /**
   * Delete a smart list
   *
   * @param userId Owner user ID
   * @param listId Smart list ID
   */
  async deleteSmartList(userId: number, listId: number): Promise<void> {
    const query = `
      DELETE FROM user_smart_lists
      WHERE id = ? AND user_id = ? AND is_system = FALSE
    `;

    await this.db.query(query, [listId, userId]);
  }

  /**
   * Get system-defined smart lists
   * Returns built-in smart lists (no database access)
   *
   * @returns Array of system smart lists
   */
  getSystemSmartLists(): Omit<import('../types').SmartList, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    return [
      {
        name: 'High Priority',
        description: 'Contacts marked as high priority',
        criteria: { priorityIn: ['high'] },
        icon: 'AlertCircle',
        color: 'red',
        contact_count: 0,
        is_system: true
      },
      {
        name: 'Needs Follow Up',
        description: 'Contacts with upcoming or overdue reminders',
        criteria: { hasReminder: true },
        icon: 'Clock',
        color: 'orange',
        contact_count: 0,
        is_system: true
      },
      {
        name: 'Recent Connections',
        description: 'Connected in the last 7 days',
        criteria: { connectionDateWithin: 7 },
        icon: 'UserPlus',
        color: 'green',
        contact_count: 0,
        is_system: true
      },
      {
        name: 'No Recent Contact',
        description: 'Not contacted in 30+ days',
        criteria: { noInteractionDays: 30 },
        icon: 'UserX',
        color: 'gray',
        contact_count: 0,
        is_system: true
      },
      {
        name: 'Starred',
        description: 'All starred contacts',
        criteria: { isStarred: true },
        icon: 'Star',
        color: 'yellow',
        contact_count: 0,
        is_system: true
      }
    ];
  }

  /**
   * Execute bulk action on multiple contacts
   *
   * @param userId Owner user ID
   * @param input Bulk action input
   * @returns Bulk action result
   */
  async executeBulkAction(
    userId: number,
    input: import('../types').BulkActionInput
  ): Promise<import('../types').BulkActionResult> {
    const result: import('../types').BulkActionResult = {
      action: input.action,
      total: input.contactIds.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const contactId of input.contactIds) {
      try {
        switch (input.action) {
          case 'add_tag':
            if (input.payload?.tag) {
              const contact = await this.getManualContactById(userId, contactId);
              if (contact) {
                const existingTags = contact.tags || [];
                if (!existingTags.includes(input.payload.tag)) {
                  await this.updateManualContact(userId, contactId, {
                    tags: [...existingTags, input.payload.tag]
                  });
                }
                result.success++;
              }
            }
            break;

          case 'remove_tag':
            if (input.payload?.tag) {
              const contact = await this.getManualContactById(userId, contactId);
              if (contact) {
                const existingTags = contact.tags || [];
                await this.updateManualContact(userId, contactId, {
                  tags: existingTags.filter(t => t !== input.payload?.tag)
                });
                result.success++;
              }
            }
            break;

          case 'set_category':
            if (input.payload?.category) {
              await this.updateManualContact(userId, contactId, {
                category: input.payload.category
              });
              result.success++;
            }
            break;

          case 'set_priority':
            if (input.payload?.priority) {
              await this.updateManualContact(userId, contactId, {
                priority: input.payload.priority
              });
              result.success++;
            }
            break;

          case 'star':
            await this.updateManualContact(userId, contactId, { is_starred: true });
            result.success++;
            break;

          case 'unstar':
            await this.updateManualContact(userId, contactId, { is_starred: false });
            result.success++;
            break;

          case 'archive':
            await this.updateManualContact(userId, contactId, { is_archived: true });
            result.success++;
            break;

          case 'unarchive':
            await this.updateManualContact(userId, contactId, { is_archived: false });
            result.success++;
            break;

          case 'delete':
            await this.deleteManualContact(userId, contactId);
            result.success++;
            break;

          case 'refer': {
            const contact = await this.getManualContactById(userId, contactId);
            if (!contact) {
              result.failed++;
              result.errors.push({ contactId, error: 'Contact not found' });
              break;
            }

            // Need an email to send a referral
            const referralEmail = contact.contact_email;
            if (!referralEmail) {
              result.failed++;
              result.errors.push({ contactId, error: 'No email address available for referral' });
              break;
            }

            const referralService = new ReferralService(this.db);
            try {
              await referralService.createReferral(userId, {
                referred_email: referralEmail,
                referred_name: contact.display_name || contact.contact_name || undefined,
                referred_phone: contact.contact_phone || undefined,
                contact_id: contactId
              });
              result.success++;
            } catch (err) {
              if (err instanceof DuplicateReferralError) {
                result.failed++;
                result.errors.push({ contactId, error: 'Referral already sent to this contact' });
              } else {
                throw err;
              }
            }
            break;
          }

          default:
            result.failed++;
            result.errors.push({
              contactId,
              error: `Unsupported action: ${input.action}`
            });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          contactId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get contact analytics
   *
   * @param userId Owner user ID
   * @param dateRange Date range for analytics
   * @returns Contact analytics data
   */
  async getContactAnalytics(
    userId: number,
    dateRange: import('../types').AnalyticsDateRange = '30d'
  ): Promise<import('../types').ContactAnalytics> {
    // Get all contacts
    const allContacts = await this.getContacts(userId);
    const connectedContacts = allContacts.filter(c => c.is_connected);
    const manualContacts = allContacts.filter(c => !c.is_connected);

    // Category distribution
    const categoryMap = new Map<string, number>();
    allContacts.forEach(c => {
      const cat = c.category || 'uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category: category as import('../types').ContactCategory | 'uncategorized',
      count
    }));

    // Source distribution
    const sourceMap = new Map<string, number>();
    allContacts.forEach(c => {
      sourceMap.set(c.source, (sourceMap.get(c.source) || 0) + 1);
    });
    const sourceDistribution = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source: source as import('../types').ContactSource,
      count
    }));

    // Priority distribution
    const priorityMap = new Map<string, number>();
    allContacts.forEach(c => {
      const pri = c.priority || 'none';
      priorityMap.set(pri, (priorityMap.get(pri) || 0) + 1);
    });
    const priorityDistribution = Array.from(priorityMap.entries()).map(([priority, count]) => ({
      priority: priority as import('../types').ContactPriority | 'none',
      count
    }));

    // Follow-up metrics
    const now = new Date();
    const upcomingReminders = allContacts.filter(c =>
      c.follow_up_date && c.follow_up_date >= now
    ).length;
    const overdueReminders = allContacts.filter(c =>
      c.follow_up_date && c.follow_up_date < now
    ).length;

    // Engagement metrics
    const contactsWithNotes = allContacts.filter(c => c.notes && c.notes.trim().length > 0).length;
    const contactsWithTags = allContacts.filter(c => c.tags && c.tags.length > 0).length;
    const totalTags = allContacts.reduce((sum, c) => sum + (c.tags?.length || 0), 0);
    const averageTagsPerContact = contactsWithTags > 0 ? totalTags / contactsWithTags : 0;

    // Top tags
    const tagMap = new Map<string, number>();
    allContacts.forEach(c => {
      c.tags?.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });
    const topTags = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Contact growth (last 30 days)
    const daysToAnalyze = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 30;
    const contactGrowth: Array<{ date: string; newContacts: number; cumulativeTotal: number }> = [];

    for (let i = daysToAnalyze - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] || '';

      const newOnThisDay = allContacts.filter(c => {
        const connectedDate = c.connected_since.toISOString().split('T')[0];
        return connectedDate === dateStr;
      }).length;

      const cumulativeTotal = allContacts.filter(c =>
        c.connected_since <= date
      ).length;

      contactGrowth.push({
        date: dateStr,
        newContacts: newOnThisDay,
        cumulativeTotal
      });
    }

    return {
      totalContacts: allContacts.length,
      connectedContacts: connectedContacts.length,
      manualContacts: manualContacts.length,
      starredContacts: allContacts.filter(c => c.is_starred).length,
      archivedContacts: allContacts.filter(c => c.is_archived).length,
      categoryDistribution,
      sourceDistribution,
      priorityDistribution,
      contactGrowth,
      upcomingReminders,
      overdueReminders,
      contactsWithNotes,
      contactsWithTags,
      averageTagsPerContact,
      topTags
    };
  }
}