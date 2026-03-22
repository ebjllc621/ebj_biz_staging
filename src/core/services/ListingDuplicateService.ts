/**
 * ListingDuplicateService - Listing Duplication Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Singleton factory pattern consistent with ServiceRegistry pattern
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @phase Phase 4A - Listing Lifecycle (Pause/Resume, Draft, Duplicate)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { getDatabaseService } from '@core/services/ServiceRegistry';
import { getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { UnauthorizedAccessError, ListingNotFoundError } from '@core/services/ListingService';
import type { DbResult } from '@core/types/db';

export interface DuplicateListingOverrides {
  name?: string;
  slug?: string;
}

export interface DuplicateListingResult {
  id: number;
  slug: string;
}

// ============================================================================
// ListingDuplicateService Implementation
// ============================================================================

export class ListingDuplicateService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Duplicate a listing as a draft copy.
   * Copies all fields except: id, slug, name, status (→ draft), approved (→ pending),
   * view_count (→ 0), favorite_count (→ 0), claimed (→ true), created_at/updated_at (→ NOW()).
   * Also copies listing_categories rows.
   */
  async duplicateListing(
    sourceId: number,
    userId: number,
    overrides?: DuplicateListingOverrides
  ): Promise<DuplicateListingResult> {
    const listingService = getListingService();

    // Fetch source listing
    const source = await listingService.getById(sourceId);
    if (!source) {
      throw new ListingNotFoundError(sourceId);
    }

    // Verify ownership
    if (source.user_id !== userId) {
      throw new UnauthorizedAccessError(userId, sourceId);
    }

    // Determine name and slug for the copy
    const newName = overrides?.name || `${source.name} (Copy)`;
    const baseSlug = overrides?.slug || `${source.slug}-copy`;

    // Ensure slug uniqueness
    const uniqueSlug = await this.generateUniqueSlug(baseSlug);

    // Copy the listing as a draft
    const result: DbResult<{ insertId: number }> = await this.db.query<{ insertId: number }>(
      `INSERT INTO listings (
        user_id, name, slug, description, type, tier,
        year_established, employee_count, email, phone, website,
        address, city, state, zip_code, country,
        latitude, longitude, category_id, active_categories, bank_categories,
        gallery_images, video_gallery, business_hours, social_media,
        features, amenities, add_ons, custom_fields, metadata,
        contact_name, contact_email, contact_phone,
        annual_revenue, certifications, languages_spoken, payment_methods,
        slogan, meta_title, meta_description, meta_keywords, keywords,
        audio_url, video_url, logo_url, cover_image_url,
        section_layout, gallery_layout, video_gallery_layout, combine_video_gallery,
        claimed, status, approved, mock,
        view_count, click_count, favorite_count
      ) SELECT
        user_id, ?, ?, description, type, tier,
        year_established, employee_count, email, phone, website,
        address, city, state, zip_code, country,
        latitude, longitude, category_id, active_categories, bank_categories,
        gallery_images, video_gallery, business_hours, social_media,
        features, amenities, add_ons, custom_fields, metadata,
        contact_name, contact_email, contact_phone,
        annual_revenue, certifications, languages_spoken, payment_methods,
        slogan, meta_title, meta_description, meta_keywords, keywords,
        audio_url, video_url, logo_url, cover_image_url,
        section_layout, gallery_layout, video_gallery_layout, combine_video_gallery,
        1, 'draft', 'pending', mock,
        0, 0, 0
      FROM listings WHERE id = ?`,
      [newName, uniqueSlug, sourceId]
    );

    const newId = result.insertId;
    if (!newId) {
      throw BizError.databaseError(
        'duplicate listing',
        new Error('No insert ID returned')
      );
    }

    // Copy listing_categories rows
    await this.copyListingCategories(sourceId, newId);

    return { id: newId, slug: uniqueSlug };
  }

  /**
   * Copy listing_categories rows from source to destination listing.
   * Gracefully handles the case where listing_categories table doesn't exist yet —
   * the main listings.category_id and listings.active_categories columns are
   * already copied by the primary INSERT.
   */
  private async copyListingCategories(sourceId: number, destId: number): Promise<void> {
    try {
      const rows = await this.db.query<{ category_id: number }>(
        'SELECT category_id FROM listing_categories WHERE listing_id = ?',
        [sourceId]
      );

      if (!rows.rows || rows.rows.length === 0) {
        return;
      }

      for (const row of rows.rows) {
        await this.db.query(
          'INSERT IGNORE INTO listing_categories (listing_id, category_id) VALUES (?, ?)',
          [destId, row.category_id]
        );
      }
    } catch {
      // listing_categories table may not exist yet — skip gracefully.
      // Category data is still preserved via listings.category_id and active_categories.
    }
  }

  /**
   * Generate a unique slug by appending -2, -3, etc. if needed.
   */
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let uniqueSlug = baseSlug;
    let counter = 2;
    let isUnique = false;

    while (!isUnique) {
      const rows = await this.db.query<{ id: number }>(
        'SELECT id FROM listings WHERE slug = ? LIMIT 1',
        [uniqueSlug]
      );

      if (!rows.rows || rows.rows.length === 0) {
        isUnique = true;
      } else {
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;

        if (counter > 1000) {
          throw BizError.internalServerError(
            'ListingDuplicateService',
            new Error('Failed to generate unique slug after 1000 attempts')
          );
        }
      }
    }

    return uniqueSlug;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let listingDuplicateServiceInstance: ListingDuplicateService | null = null;

export function getListingDuplicateService(): ListingDuplicateService {
  if (!listingDuplicateServiceInstance) {
    const db = getDatabaseService();
    listingDuplicateServiceInstance = new ListingDuplicateService(db);
  }
  return listingDuplicateServiceInstance;
}
