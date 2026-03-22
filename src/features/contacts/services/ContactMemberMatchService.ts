/**
 * ContactMemberMatchService - New Member Contact Matching
 *
 * Checks if a newly registered user's email/phone matches any
 * existing user_contacts records and notifies those contact owners.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 5.5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/contacts/services/ContactMatchService.ts - Matching patterns
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import type { RowDataPacket } from '@core/types/mariadb-compat';

// ============================================================================
// TYPES
// ============================================================================

interface ContactOwnerMatch {
  contactOwnerId: number;
  contactId: number;
  contactName: string;
  matchedField: 'email' | 'phone';
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ContactMemberMatchService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Check if newly registered user matches any existing contacts
   * and notify those contact owners.
   *
   * @param newUserId - ID of the newly registered user
   * @param email - Registered email address
   * @param phone - Optional phone number
   * @param displayName - User's display name
   * @returns Number of notifications sent
   */
  async notifyContactOwners(
    newUserId: number,
    email: string,
    phone: string | null,
    displayName: string
  ): Promise<number> {
    // Find all contact owners who have this email/phone in their contacts
    const matches = await this.findContactOwners(email, phone, newUserId);

    let notificationsSent = 0;

    for (const match of matches) {
      try {
        await this.notificationService.dispatch({
          type: 'contact.became_member',
          recipientId: match.contactOwnerId,
          title: `${displayName} just joined Bizconekt!`,
          message: `Your contact "${match.contactName}" is now on Bizconekt. Send a connection request to stay in touch.`,
          entityType: 'user',
          entityId: newUserId,
          actionUrl: `/profile/${newUserId}?action=connect`,
          priority: 'normal',
          metadata: {
            newUserId,
            contactId: match.contactId,
            contactName: match.contactName,
            matchedField: match.matchedField
          }
        });
        notificationsSent++;
      } catch (error) {
        // Log but don't fail - continue with other notifications
        console.error(`[ContactMemberMatchService] Failed to notify user ${match.contactOwnerId}:`, error);
      }
    }

    return notificationsSent;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Find all users who have this email/phone in their contacts
   *
   * @param email - Email to match
   * @param phone - Phone to match (optional)
   * @param excludeUserId - User ID to exclude (the new user)
   * @returns Array of contact owner matches
   */
  private async findContactOwners(
    email: string,
    phone: string | null,
    excludeUserId: number
  ): Promise<ContactOwnerMatch[]> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone ? this.normalizePhone(phone) : null;

    // Query for contacts matching this email or phone
    // Exclude the new user themselves (they can't be their own contact)
    // Only match manual contacts (contact_user_id IS NULL)
    const query = `
      SELECT
        uc.user_id as contact_owner_id,
        uc.id as contact_id,
        uc.contact_name,
        CASE
          WHEN LOWER(uc.contact_email) = ? THEN 'email'
          WHEN ? IS NOT NULL AND REGEXP_REPLACE(uc.contact_phone, '[^0-9]', '') LIKE ? THEN 'phone'
        END as matched_field
      FROM user_contacts uc
      WHERE uc.contact_user_id IS NULL
        AND uc.user_id != ?
        AND (
          LOWER(uc.contact_email) = ?
          OR (? IS NOT NULL AND REGEXP_REPLACE(uc.contact_phone, '[^0-9]', '') LIKE ?)
        )
    `;

    const phonePattern = normalizedPhone ? `%${normalizedPhone.slice(-10)}` : '';

    const result = await this.db.query<RowDataPacket>(query, [
      normalizedEmail,
      normalizedPhone,
      phonePattern,
      excludeUserId,
      normalizedEmail,
      normalizedPhone,
      phonePattern
    ]);

    return (result.rows || []).map(row => ({
      contactOwnerId: row.contact_owner_id,
      contactId: row.contact_id,
      contactName: row.contact_name || 'Your contact',
      matchedField: row.matched_field as 'email' | 'phone'
    }));
  }

  /**
   * Normalize phone number for comparison
   *
   * Strips non-digits and removes US country code if present
   */
  private normalizePhone(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    // Handle US country code (+1 or 1)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return digitsOnly.substring(1);
    }
    return digitsOnly;
  }
}
