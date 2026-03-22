/**
 * ContactMatchService - Contact-to-User Matching Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Service pattern: Feature-specific service in contacts feature
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/connections/services/RecommendationService.ts - User lookup patterns
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import type {
  ContactMatchResult,
  MatchedUserInfo,
  BatchMatchResult,
  MatchType,
  MatchConfidence
} from '../types/matching';
import type { Contact } from '../types';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ContactMatchService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // MATCHING OPERATIONS
  // ==========================================================================

  /**
   * Match a single contact to a Bizconekt user
   *
   * @param currentUserId - ID of the user doing the matching
   * @param contact - Contact to match
   * @returns Match result with user info if found
   */
  async matchContact(
    currentUserId: number,
    contact: Contact
  ): Promise<ContactMatchResult> {
    // Skip already-connected contacts (they have user_id set)
    if (contact.is_connected && contact.user_id) {
      return {
        isMatched: true,
        matchedUserId: contact.user_id,
        matchedUser: null,
        matchType: 'email',
        confidence: 'high',
        metadata: { matchedField: null, matchedValue: null }
      };
    }

    // Priority 1: Email match (highest confidence)
    if (contact.contact_email) {
      const emailMatch = await this.findUserByEmail(
        currentUserId,
        contact.contact_email
      );
      if (emailMatch) {
        return {
          isMatched: true,
          matchedUserId: emailMatch.id,
          matchedUser: emailMatch,
          matchType: 'email',
          confidence: 'high',
          metadata: {
            matchedField: 'email',
            matchedValue: contact.contact_email.toLowerCase()
          }
        };
      }
    }

    // Priority 2: Phone match (high confidence)
    if (contact.contact_phone) {
      const phoneMatch = await this.findUserByPhone(
        currentUserId,
        contact.contact_phone
      );
      if (phoneMatch) {
        return {
          isMatched: true,
          matchedUserId: phoneMatch.id,
          matchedUser: phoneMatch,
          matchType: 'phone',
          confidence: 'high',
          metadata: {
            matchedField: 'phone',
            matchedValue: this.normalizePhone(contact.contact_phone)
          }
        };
      }
    }

    // Priority 3: Name + Company fuzzy match (lower confidence)
    if (contact.contact_name && contact.contact_company) {
      const fuzzyMatch = await this.findUserByNameAndCompany(
        currentUserId,
        contact.contact_name,
        contact.contact_company
      );
      if (fuzzyMatch) {
        return {
          isMatched: true,
          matchedUserId: fuzzyMatch.id,
          matchedUser: fuzzyMatch,
          matchType: 'name_company',
          confidence: 'medium',
          metadata: {
            matchedField: 'name',
            matchedValue: contact.contact_name
          }
        };
      }
    }

    // No match found
    return {
      isMatched: false,
      matchedUserId: null,
      matchedUser: null,
      matchType: 'none',
      confidence: 'none'
    };
  }

  /**
   * Batch match multiple contacts
   *
   * @param currentUserId - ID of the user doing the matching
   * @param contacts - Contacts to match
   * @returns Map of contact IDs to match results
   */
  async batchMatchContacts(
    currentUserId: number,
    contacts: Contact[]
  ): Promise<BatchMatchResult> {
    const results = new Map<number, ContactMatchResult>();
    let matched = 0;

    console.log('[ContactMatchService] batchMatchContacts called with', contacts.length, 'contacts');

    // Filter to only manual contacts (is_connected = false)
    const manualContacts = contacts.filter(c => !c.is_connected);
    console.log('[ContactMatchService] After filter (is_connected=false):', manualContacts.length, 'manual contacts');

    for (const contact of manualContacts) {
      console.log('[ContactMatchService] Matching contact:', contact.id, '-', contact.contact_name, '- email:', contact.contact_email, '- phone:', contact.contact_phone);
      const result = await this.matchContact(currentUserId, contact);
      console.log('[ContactMatchService] Match result for', contact.id, ':', result.isMatched ? `MATCHED (${result.matchType})` : 'NO MATCH');
      results.set(contact.id, result);
      if (result.isMatched) {
        matched++;
      }
    }

    console.log('[ContactMatchService] Final results - total:', manualContacts.length, 'matched:', matched);
    return {
      total: manualContacts.length,
      matched,
      results
    };
  }

  // ==========================================================================
  // LOOKUP METHODS
  // ==========================================================================

  /**
   * Find user by email address
   */
  private async findUserByEmail(
    currentUserId: number,
    email: string
  ): Promise<MatchedUserInfo | null> {
    const normalizedEmail = email.toLowerCase().trim();
    console.log('[ContactMatchService] findUserByEmail - searching for:', normalizedEmail);

    const query = `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        u.occupation,
        u.city,
        (
          SELECT COUNT(*) > 0 FROM user_connection
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'connected'
        ) as is_connected,
        (
          SELECT COUNT(*) > 0 FROM connection_request
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'pending'
        ) as has_pending_request
      FROM users u
      WHERE LOWER(u.email) = ?
        AND u.id != ?
      LIMIT 1
    `;

    const result = await this.db.query<RowDataPacket>(query, [
      currentUserId, currentUserId,
      currentUserId, currentUserId,
      normalizedEmail,
      currentUserId
    ]);

    const row = result.rows?.[0];
    console.log('[ContactMatchService] findUserByEmail result:', row ? `FOUND user ${row.id} (${row.username})` : 'NOT FOUND');
    if (!row) return null;

    return this.mapRowToMatchedUser(row);
  }

  /**
   * Find user by phone number
   */
  private async findUserByPhone(
    currentUserId: number,
    phone: string
  ): Promise<MatchedUserInfo | null> {
    const normalizedPhone = this.normalizePhone(phone);

    // Skip if phone is too short after normalization
    if (normalizedPhone.length < 10) {
      return null;
    }

    // Query for users with matching normalized phone
    // Use SQL to strip non-digits for comparison
    const query = `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        u.occupation,
        u.city,
        (
          SELECT COUNT(*) > 0 FROM user_connection
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'connected'
        ) as is_connected,
        (
          SELECT COUNT(*) > 0 FROM connection_request
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'pending'
        ) as has_pending_request
      FROM users u
      WHERE u.contact_phone IS NOT NULL
        AND REGEXP_REPLACE(u.contact_phone, '[^0-9]', '') LIKE ?
        AND u.id != ?
      LIMIT 1
    `;

    // Match last 10 digits (handles country codes)
    const phonePattern = `%${normalizedPhone.slice(-10)}`;

    const result = await this.db.query<RowDataPacket>(query, [
      currentUserId, currentUserId,
      currentUserId, currentUserId,
      phonePattern,
      currentUserId
    ]);

    const row = result.rows?.[0];
    if (!row) return null;

    return this.mapRowToMatchedUser(row);
  }

  /**
   * Find user by name and company (fuzzy match)
   * Lower confidence - requires both name and company to match
   */
  private async findUserByNameAndCompany(
    currentUserId: number,
    name: string,
    company: string
  ): Promise<MatchedUserInfo | null> {
    const normalizedName = name.toLowerCase().trim();
    const normalizedCompany = company.toLowerCase().trim();

    // Skip if name or company is too short
    if (normalizedName.length < 2 || normalizedCompany.length < 2) {
      return null;
    }

    // Query for users with matching display name AND company in occupation/bio
    const query = `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        u.occupation,
        u.city,
        (
          SELECT COUNT(*) > 0 FROM user_connection
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'connected'
        ) as is_connected,
        (
          SELECT COUNT(*) > 0 FROM connection_request
          WHERE ((sender_user_id = ? AND receiver_user_id = u.id)
             OR (receiver_user_id = ? AND sender_user_id = u.id))
            AND status = 'pending'
        ) as has_pending_request
      FROM users u
      WHERE (
        LOWER(u.display_name) LIKE ?
        OR LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE ?
      )
      AND (
        LOWER(u.occupation) LIKE ?
        OR LOWER(u.bio) LIKE ?
      )
      AND u.id != ?
      LIMIT 1
    `;

    const namePattern = `%${normalizedName}%`;
    const companyPattern = `%${normalizedCompany}%`;

    const result = await this.db.query<RowDataPacket>(query, [
      currentUserId, currentUserId,
      currentUserId, currentUserId,
      namePattern, namePattern,
      companyPattern, companyPattern,
      currentUserId
    ]);

    const row = result.rows?.[0];
    if (!row) return null;

    return this.mapRowToMatchedUser(row);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Handle US country code (+1 or 1)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return digitsOnly.substring(1);
    }

    return digitsOnly;
  }

  /**
   * Map database row to MatchedUserInfo
   */
  private mapRowToMatchedUser(row: RowDataPacket): MatchedUserInfo {
    return {
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color,
      occupation: row.occupation,
      city: row.city,
      isAlreadyConnected: Boolean(bigIntToNumber(row.is_connected)),
      hasPendingRequest: Boolean(bigIntToNumber(row.has_pending_request))
    };
  }
}
