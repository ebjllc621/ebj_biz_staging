/**
 * SEOService - Search Engine Optimization Management
 *
 * GOVERNANCE COMPLIANCE:
 * - Service Boundary: DatabaseService ONLY (no direct mysql2/mariadb)
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError for business logic errors
 * - Build Map v2.1 ENHANCED patterns
 * - Tier: STANDARD
 *
 * Features:
 * - Dynamic meta tag generation (title, description, keywords)
 * - Open Graph/Twitter Card support
 * - Sitemap.xml generation
 * - Schema.org structured data (JSON-LD)
 * - SEO health scoring (0-100 with grade)
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.2
 * @phase Phase 6.3 - SEO & Analytics
 * @complexity STANDARD tier (~600 lines, ≤4 dependencies)
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { SEOMetadataRow, EventRow, OfferRow, ReviewRow } from '@core/types/db-rows';
import { bigIntToNumber } from '@core/utils/bigint';

// Extended ReviewRow with JOIN columns
interface ReviewWithDetailsRow extends ReviewRow {
  first_name: string | null;
  last_name: string | null;
  listing_name: string;
}

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface SEOMetadata {
  id: number;
  entityType: string;
  entityId: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  schemaType: string | null;
  schemaData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveMetaTagsInput {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: string;
  schemaData?: Record<string, unknown>;
}

export interface SEOScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'F';
  issues: string[];
}

// ============================================================================
// SEOService Implementation
// ============================================================================

export class SEOService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // META TAG MANAGEMENT (4 methods)
  // ==========================================================================

  /**
   * Get meta tags for entity
   *
   * @param entityType - 'listing', 'category', 'event', 'offer'
   * @param entityId - Entity ID
   * @returns SEO metadata or null if not found
   *
   * @example
   * ```typescript
   * const seoService = new SEOService(db);
   * const metadata = await seoService.getMetaTags('listing', 1);
   * ```
   */
  async getMetaTags(entityType: string, entityId: number): Promise<SEOMetadata | null> {
    const result: DbResult<SEOMetadataRow> = await this.db.query(
      `SELECT * FROM seo_metadata WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.mapRowToSEO(row);
  }

  /**
   * Save or update meta tags for entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param data - Meta tag data
   * @returns Updated SEO metadata
   */
  async saveMetaTags(
    entityType: string,
    entityId: number,
    data: SaveMetaTagsInput
  ): Promise<SEOMetadata> {
    const existing = await this.getMetaTags(entityType, entityId);

    if (existing) {
      // Update existing record
      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (data.metaTitle !== undefined) {
        updates.push('meta_title = ?');
        values.push(data.metaTitle);
      }
      if (data.metaDescription !== undefined) {
        updates.push('meta_description = ?');
        values.push(data.metaDescription);
      }
      if (data.metaKeywords !== undefined) {
        updates.push('meta_keywords = ?');
        values.push(data.metaKeywords);
      }
      if (data.canonicalUrl !== undefined) {
        updates.push('canonical_url = ?');
        values.push(data.canonicalUrl);
      }
      if (data.ogTitle !== undefined) {
        updates.push('og_title = ?');
        values.push(data.ogTitle);
      }
      if (data.ogDescription !== undefined) {
        updates.push('og_description = ?');
        values.push(data.ogDescription);
      }
      if (data.ogImage !== undefined) {
        updates.push('og_image = ?');
        values.push(data.ogImage);
      }
      if (data.ogType !== undefined) {
        updates.push('og_type = ?');
        values.push(data.ogType);
      }
      if (data.twitterCard !== undefined) {
        updates.push('twitter_card = ?');
        values.push(data.twitterCard);
      }
      if (data.twitterTitle !== undefined) {
        updates.push('twitter_title = ?');
        values.push(data.twitterTitle);
      }
      if (data.twitterDescription !== undefined) {
        updates.push('twitter_description = ?');
        values.push(data.twitterDescription);
      }
      if (data.twitterImage !== undefined) {
        updates.push('twitter_image = ?');
        values.push(data.twitterImage);
      }
      if (data.schemaType !== undefined) {
        updates.push('schema_type = ?');
        values.push(data.schemaType);
      }
      if (data.schemaData !== undefined) {
        updates.push('schema_data = ?');
        values.push(JSON.stringify(data.schemaData));
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(entityType, entityId);

        await this.db.query(
          `UPDATE seo_metadata SET ${updates.join(', ')} WHERE entity_type = ? AND entity_id = ?`,
          values
        );
      }

      const updated = await this.getMetaTags(entityType, entityId);
      if (!updated) {
        throw BizError.databaseError(
          'update SEO metadata',
          new Error('Failed to retrieve updated metadata')
        );
      }

      return updated;
    } else {
      // Insert new record
      const result: DbResult = await this.db.query(
        `INSERT INTO seo_metadata (
          entity_type, entity_id, meta_title, meta_description, meta_keywords,
          canonical_url, og_title, og_description, og_image, og_type,
          twitter_card, twitter_title, twitter_description, twitter_image,
          schema_type, schema_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entityType,
          entityId,
          data.metaTitle || null,
          data.metaDescription || null,
          data.metaKeywords || null,
          data.canonicalUrl || null,
          data.ogTitle || null,
          data.ogDescription || null,
          data.ogImage || null,
          data.ogType || null,
          data.twitterCard || null,
          data.twitterTitle || null,
          data.twitterDescription || null,
          data.twitterImage || null,
          data.schemaType || null,
          data.schemaData ? JSON.stringify(data.schemaData) : null
        ]
      );

      const created = await this.getMetaTags(entityType, entityId);
      if (!created) {
        throw BizError.databaseError(
          'create SEO metadata',
          new Error('Failed to retrieve created metadata')
        );
      }

      return created;
    }
  }

  /**
   * Delete meta tags for entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   */
  async deleteMetaTags(entityType: string, entityId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM seo_metadata WHERE entity_type = ? AND entity_id = ?`,
      [entityType, entityId]
    );
  }

  /**
   * Generate default meta tags from entity data
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Generated SEO metadata
   */
  async generateDefaultMetaTags(
    entityType: string,
    entityId: number
  ): Promise<SEOMetadata> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';
    let title = '';
    let description = '';
    let keywords = '';

    if (entityType === 'listing') {
      const result = await this.db.query<{ name: string; short_description?: string; long_description?: string }>(
        `SELECT name, short_description, long_description FROM listings WHERE id = ?`,
        [entityId]
      );

      if (result.rows.length > 0) {
        const listing = result.rows[0]!;
        title = `${listing.name} | Bizconekt`;
        description = listing.short_description || listing.long_description?.substring(0, 160) || '';
        keywords = `${listing.name}, business, directory`;
      }
    } else if (entityType === 'event') {
      const result = await this.db.query<{ title: string; description?: string }>(
        `SELECT title, description FROM events WHERE id = ?`,
        [entityId]
      );

      if (result.rows.length > 0) {
        const event = result.rows[0]!;
        title = `${event.title} | Events | Bizconekt`;
        description = event.description?.substring(0, 160) || '';
        keywords = `${event.title}, event, dallas`;
      }
    }

    return this.saveMetaTags(entityType, entityId, {
      metaTitle: title,
      metaDescription: description,
      metaKeywords: keywords,
      canonicalUrl: `${baseUrl}/${entityType}s/${entityId}`,
      ogTitle: title,
      ogDescription: description,
      ogType: 'website',
      twitterCard: 'summary_large_image',
      twitterTitle: title,
      twitterDescription: description
    });
  }

  // ==========================================================================
  // SITEMAP GENERATION (2 methods)
  // ==========================================================================

  /**
   * Generate complete sitemap.xml
   *
   * @returns XML string
   *
   * @example
   * ```typescript
   * const sitemap = await seoService.generateSitemap();
   * // Returns: <?xml version="1.0"...
   * ```
   */
  async generateSitemap(): Promise<string> {
    const urls: string[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';

    // Get all public listings
    const listingsResult: DbResult<{id: number; updated_at: string}> = await this.db.query(
      `SELECT id, updated_at FROM listings WHERE status = 'active' ORDER BY updated_at DESC`
    );

    for (const listing of listingsResult.rows) {
      urls.push(`
  <url>
    <loc>${baseUrl}/listings/${listing.id}</loc>
    <lastmod>${new Date(listing.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Get all categories
    const categoriesResult: DbResult<{id: number; updated_at: string}> = await this.db.query(
      `SELECT id, updated_at FROM categories ORDER BY updated_at DESC`
    );

    for (const category of categoriesResult.rows) {
      urls.push(`
  <url>
    <loc>${baseUrl}/categories/${category.id}</loc>
    <lastmod>${new Date(category.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    // Get all published events
    const eventsResult: DbResult<{id: number; updated_at: string}> = await this.db.query(
      `SELECT id, updated_at FROM events WHERE status = 'published' ORDER BY updated_at DESC`
    );

    for (const event of eventsResult.rows) {
      urls.push(`
  <url>
    <loc>${baseUrl}/events/${event.id}</loc>
    <lastmod>${new Date(event.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Get all active jobs
    const jobsResult: DbResult<{id: number; slug: string; updated_at: string}> = await this.db.query(
      `SELECT id, slug, updated_at FROM job_postings WHERE status = 'active' ORDER BY updated_at DESC`
    );

    for (const job of jobsResult.rows) {
      urls.push(`
  <url>
    <loc>${baseUrl}/jobs/${job.slug}</loc>
    <lastmod>${new Date(job.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Get all published guides
    const guidesResult: DbResult<{slug: string; updated_at: string}> = await this.db.query(
      `SELECT slug, updated_at FROM content_guides WHERE status = 'published' AND slug IS NOT NULL ORDER BY updated_at DESC`
    );

    for (const guide of guidesResult.rows) {
      urls.push(`
  <url>
    <loc>${baseUrl}/guides/${guide.slug}</loc>
    <lastmod>${new Date(guide.updated_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }

  /**
   * Get sitemap URLs for specific entity type
   *
   * @param entityType - 'listing', 'category', 'event'
   * @returns Array of URLs
   */
  async getSitemapUrls(entityType: string): Promise<string[]> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';
    const urls: string[] = [];

    if (entityType === 'listing') {
      const result: DbResult<{id: number}> = await this.db.query(
      `SELECT id FROM listings WHERE status = 'active'`
      );
      result.rows.forEach(row => {
        urls.push(`${baseUrl}/listings/${row.id}`);
      });
    } else if (entityType === 'category') {
      const result: DbResult<{id: number}> = await this.db.query(`SELECT id FROM categories`);
      result.rows.forEach(row => {
        urls.push(`${baseUrl}/categories/${row.id}`);
      });
    } else if (entityType === 'event') {
      const result: DbResult<{id: number}> = await this.db.query(
        `SELECT id FROM events WHERE status = 'published'`
      );
      result.rows.forEach(row => {
        urls.push(`${baseUrl}/events/${row.id}`);
      });
    }

    return urls;
  }

  // ==========================================================================
  // SCHEMA.ORG STRUCTURED DATA (4 methods)
  // ==========================================================================

  /**
   * Generate LocalBusiness schema.org JSON-LD
   *
   * @param listingId - Listing ID
   * @returns JSON-LD object
   *
   * @example
   * ```typescript
   * const schema = await seoService.generateLocalBusinessSchema(1);
   * ```
   */
  async generateLocalBusinessSchema(listingId: number): Promise<Record<string, unknown>> {
    interface ListingSchemaRow {
      name: string;
      short_description: string | null;
      long_description: string | null;
      phone_number: string | null;
      email: string | null;
      address_line1: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      business_hours: string | null;
    }

    const listingResult: DbResult<ListingSchemaRow> = await this.db.query(
      `SELECT name, short_description, long_description, phone_number, email,
       address_line1, city, state, zip_code, business_hours FROM listings WHERE id = ?`,
      [listingId]
    );

    if (listingResult.rows.length === 0) {
      throw BizError.notFound('listing', listingId);
    }

    const listing = listingResult.rows[0]!;

    // Get reviews for aggregate rating
    const reviewsResult: DbResult<{avgRating: number; reviewCount: bigint | number}> = await this.db.query(
      `SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount
       FROM reviews WHERE listing_id = ? AND status = 'approved'`,
      [listingId]
    );

    const reviewRow = reviewsResult.rows[0] || { avgRating: 0, reviewCount: 0 };
    const avgRating = reviewRow.avgRating || 0;
    const reviewCount = bigIntToNumber(reviewRow.reviewCount);

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: listing.name,
      description: listing.short_description || listing.long_description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/listings/${listingId}`,
      telephone: listing.phone_number,
      email: listing.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: listing.address_line1,
        addressLocality: listing.city,
        addressRegion: listing.state,
        postalCode: listing.zip_code,
        addressCountry: 'US'
      }
    };

    if (reviewCount > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: parseFloat(String(avgRating)).toFixed(1),
        reviewCount: reviewCount
      };
    }

    if (listing.business_hours) {
      try {
        // GOVERNANCE: mariadb auto-parses JSON columns - check if already object
        schema.openingHours = typeof listing.business_hours === 'object'
          ? listing.business_hours
          : JSON.parse(listing.business_hours);
      } catch {
        // Skip if business_hours isn't valid JSON
      }
    }

    return schema;
  }

  /**
   * Generate Event schema.org JSON-LD
   *
   * @param eventId - Event ID
   * @returns JSON-LD object
   */
  async generateEventSchema(eventId: number): Promise<Record<string, unknown>> {
    const eventResult: DbResult<EventRow> = await this.db.query<EventRow>(
      `SELECT * FROM events WHERE id = ?`,
      [eventId]
    );

    const event = eventResult.rows[0];
    if (!event) {
      throw BizError.notFound('event', eventId);
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: new Date(event.start_date).toISOString(),
      endDate: new Date(event.end_date).toISOString(),
      location: {
        '@type': 'Place',
        // @fixed 2026-01-04 - EventRow doesn't have 'location', use venue_name/address
        name: event.venue_name || event.address || 'TBD',
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.address,
          addressLocality: event.city || 'Dallas',
          addressRegion: event.state || 'TX',
          addressCountry: 'US'
        }
      },
      offers: {
        '@type': 'Offer',
        // @fixed 2026-01-04 - EventRow uses ticket_price not price
        price: event.ticket_price || 0,
        priceCurrency: 'USD'
      }
    };
  }

  /**
   * Generate Offer schema.org JSON-LD
   *
   * @param offerId - Offer ID
   * @returns JSON-LD object
   */
  async generateOfferSchema(offerId: number): Promise<Record<string, unknown>> {
    const offerResult: DbResult<OfferRow> = await this.db.query<OfferRow>(
      `SELECT * FROM offers WHERE id = ?`,
      [offerId]
    );

    const offer = offerResult.rows[0];
    if (!offer) {
      throw BizError.notFound('offer', offerId);
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Offer',
      name: offer.title,
      description: offer.description,
      price: offer.sale_price || offer.original_price || 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: new Date(offer.start_date).toISOString(),
      validThrough: new Date(offer.end_date).toISOString()
    };
  }

  /**
   * Generate JobPosting schema.org JSON-LD for Google for Jobs
   * @see https://schema.org/JobPosting
   * @see https://developers.google.com/search/docs/appearance/structured-data/job-posting
   *
   * @param jobId - Job ID
   * @returns JSON-LD object conforming to Schema.org JobPosting
   */
  async generateJobPostingSchema(jobId: number): Promise<Record<string, unknown>> {
    // Query job with business info
    const result = await this.db.query<{
      id: number;
      title: string;
      description: string;
      employment_type: string;
      compensation_type: string;
      compensation_min: number | null;
      compensation_max: number | null;
      compensation_currency: string;
      work_location_type: string;
      address: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      application_deadline: string | null;
      created_at: string;
      business_name: string;
      logo_url: string | null;
      business_id: number;
    }>(
      `SELECT j.*, l.name as business_name, l.logo_url
       FROM job_postings j
       LEFT JOIN listings l ON j.business_id = l.id
       WHERE j.id = ?`,
      [jobId]
    );

    const row = result.rows[0];
    if (!row) {
      throw BizError.notFound('job', jobId);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bizconekt.com';

    // Employment type mapping to Schema.org values
    const employmentTypeMap: Record<string, string> = {
      full_time: 'FULL_TIME',
      part_time: 'PART_TIME',
      seasonal: 'TEMPORARY',
      temporary: 'TEMPORARY',
      contract: 'CONTRACTOR',
      internship: 'INTERN',
      gig: 'PER_DIEM'
    };

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: row.title,
      description: row.description,
      datePosted: new Date(row.created_at).toISOString(),
      employmentType: employmentTypeMap[row.employment_type] || 'OTHER',
      hiringOrganization: {
        '@type': 'Organization',
        name: row.business_name,
        sameAs: `${baseUrl}/listings/${row.business_id}`,
        logo: row.logo_url
      },
      identifier: {
        '@type': 'PropertyValue',
        name: 'Bizconekt Job ID',
        value: jobId.toString()
      }
    };

    // Application deadline
    if (row.application_deadline) {
      schema.validThrough = new Date(row.application_deadline).toISOString();
    }

    // Location or TELECOMMUTE
    if (row.work_location_type === 'remote') {
      schema.jobLocationType = 'TELECOMMUTE';
    } else {
      schema.jobLocation = {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: row.address,
          addressLocality: row.city,
          addressRegion: row.state,
          postalCode: row.zip_code,
          addressCountry: 'US'
        }
      };
    }

    // Salary/compensation
    if (row.compensation_type !== 'competitive' && row.compensation_min) {
      const unitMap: Record<string, string> = {
        hourly: 'HOUR',
        salary: 'YEAR',
        tips_hourly: 'HOUR'
      };

      schema.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: row.compensation_currency || 'USD',
        value: {
          '@type': 'QuantitativeValue',
          minValue: row.compensation_min,
          maxValue: row.compensation_max || row.compensation_min,
          unitText: unitMap[row.compensation_type] || 'YEAR'
        }
      };
    }

    // Update schema_generated_at timestamp
    await this.db.query(
      'UPDATE job_postings SET schema_generated_at = NOW() WHERE id = ?',
      [jobId]
    );

    return schema;
  }

  /**
   * Generate Review schema.org JSON-LD
   *
   * @param reviewId - Review ID
   * @returns JSON-LD object
   */
  async generateReviewSchema(reviewId: number): Promise<Record<string, unknown>> {
    const reviewResult: DbResult<ReviewWithDetailsRow> = await this.db.query<ReviewWithDetailsRow>(
      `SELECT r.*, u.first_name, u.last_name, l.name as listing_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ?`,
      [reviewId]
    );

    const review = reviewResult.rows[0];
    if (!review) {
      throw BizError.notFound('review', reviewId);
    }

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'LocalBusiness',
        name: review.listing_name
      },
      author: {
        '@type': 'Person',
        name: `${review.first_name || ''} ${review.last_name || ''}`.trim() || 'Anonymous'
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5
      },
      reviewBody: review.review_text,
      datePublished: new Date(review.created_at).toISOString()
    };

    // Add review images to schema (Task 7.7)
    if (review.images) {
      const imageList: unknown = typeof review.images === 'string'
        ? JSON.parse(review.images)
        : review.images;
      if (Array.isArray(imageList) && imageList.length > 0) {
        // Filter out video URLs — only include actual image URLs in schema
        const imageUrls = (imageList as string[]).filter((url: string) =>
          !(/youtube\.com|youtu\.be|vimeo\.com|rumble\.com/i.test(url)) &&
          !(/\.(mp4|webm|mov)$/i.test(url))
        );
        if (imageUrls.length > 0) {
          schema.image = imageUrls;
        }
      }
    }

    return schema;
  }

  // ==========================================================================
  // SEO HEALTH ANALYSIS (2 methods)
  // ==========================================================================

  /**
   * Calculate SEO health score (0-100)
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Score object with grade and issues
   *
   * @example
   * ```typescript
   * const score = await seoService.calculateSEOScore('listing', 1);
   * // Returns: { score: 85, grade: 'A', issues: [] }
   * ```
   */
  async calculateSEOScore(entityType: string, entityId: number): Promise<SEOScore> {
    const seo = await this.getMetaTags(entityType, entityId);
    let score = 0;
    const issues: string[] = [];

    // Meta title (25 points)
    if (seo?.metaTitle) {
      if (seo.metaTitle.length >= 30 && seo.metaTitle.length <= 60) {
        score += 25;
      } else {
        score += 10;
        issues.push('Meta title should be 30-60 characters');
      }
    } else {
      issues.push('Missing meta title');
    }

    // Meta description (25 points)
    if (seo?.metaDescription) {
      if (seo.metaDescription.length >= 120 && seo.metaDescription.length <= 160) {
        score += 25;
      } else {
        score += 10;
        issues.push('Meta description should be 120-160 characters');
      }
    } else {
      issues.push('Missing meta description');
    }

    // Open Graph tags (20 points)
    if (seo?.ogTitle && seo?.ogDescription && seo?.ogImage) {
      score += 20;
    } else {
      issues.push('Incomplete Open Graph tags');
    }

    // Schema.org data (20 points)
    if (seo?.schemaData) {
      score += 20;
    } else {
      issues.push('Missing schema.org structured data');
    }

    // Canonical URL (10 points)
    if (seo?.canonicalUrl) {
      score += 10;
    } else {
      issues.push('Missing canonical URL');
    }

    return {
      score,
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'F',
      issues
    };
  }

  /**
   * Get all SEO metadata with optional filters
   *
   * @param filters - Optional filters (entityType)
   * @returns Array of SEO metadata
   */
  async getAllSEOMetadata(filters?: { entityType?: string }): Promise<SEOMetadata[]> {
    let query = `SELECT * FROM seo_metadata`;
    const params: string[] = [];

    if (filters?.entityType) {
      query += ` WHERE entity_type = ?`;
      params.push(filters.entityType);
    }

    query += ` ORDER BY updated_at DESC LIMIT 1000`;

    const result: DbResult<SEOMetadataRow> = await this.db.query(query, params);

    return result.rows.map(this.mapRowToSEO);
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private mapRowToSEO(row: SEOMetadataRow): SEOMetadata {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      metaKeywords: row.meta_keywords,
      canonicalUrl: row.canonical_url,
      ogTitle: row.og_title,
      ogDescription: row.og_description,
      ogImage: row.og_image,
      ogType: row.og_type,
      twitterCard: row.twitter_card,
      twitterTitle: row.twitter_title,
      twitterDescription: row.twitter_description,
      twitterImage: row.twitter_image,
      schemaType: row.schema_type,
      // GOVERNANCE: mariadb auto-parses JSON columns - check if already object
      schemaData: row.schema_data ? (typeof row.schema_data === 'object' ? row.schema_data : JSON.parse(row.schema_data)) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
