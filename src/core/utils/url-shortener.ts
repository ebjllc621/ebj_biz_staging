/**
 * URL Shortener Utility
 *
 * Generates short codes for vanity URLs
 *
 * @tier STANDARD
 * @phase TD-P3-005 - Shortened Vanity URLs
 * @authority Phase 3 Brain Plan
 */

import { DatabaseService } from '@core/services/DatabaseService';

// Characters for short codes (alphanumeric, excluding confusing chars like 0/O, 1/l)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 6;

/**
 * Generate a random short code
 */
export function generateShortCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return code;
}

/**
 * Create a short URL for an entity
 * @param db - DatabaseService instance
 * @param fullUrl - Full URL to shorten
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @param expiresAt - Optional expiration date
 * @returns Short code
 */
export async function createShortUrl(
  db: DatabaseService,
  fullUrl: string,
  entityType: 'offer' | 'listing' | 'event' = 'offer',
  entityId?: number,
  expiresAt?: Date
): Promise<string> {
  // Generate unique short code (retry if collision)
  let shortCode: string;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    shortCode = generateShortCode();
    const existing = await db.query<{ id: number }>(
      'SELECT id FROM url_shortcodes WHERE short_code = ?',
      [shortCode]
    );

    if (existing.rows.length === 0) {
      break;
    }

    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    // Fallback: use longer code
    shortCode = generateShortCode() + generateShortCode().substring(0, 2);
  }

  // Insert the mapping
  await db.query(
    `INSERT INTO url_shortcodes (short_code, full_url, entity_type, entity_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [shortCode, fullUrl, entityType, entityId || null, expiresAt || null]
  );

  return shortCode;
}

/**
 * Resolve a short code to the full URL
 * @param db - DatabaseService instance
 * @param shortCode - Short code to resolve
 * @returns Full URL or null if not found/expired
 */
export async function resolveShortUrl(
  db: DatabaseService,
  shortCode: string
): Promise<string | null> {
  const result = await db.query<{
    id: number;
    full_url: string;
    expires_at: Date | null;
  }>(
    'SELECT id, full_url, expires_at FROM url_shortcodes WHERE short_code = ?',
    [shortCode]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  // Check expiration
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null;
  }

  // Increment click count (fire-and-forget)
  db.query(
    'UPDATE url_shortcodes SET clicks = clicks + 1 WHERE id = ?',
    [row.id]
  ).catch(() => {
    // Ignore click tracking errors
  });

  return row.full_url;
}

/**
 * Build the short URL from a code
 * @param shortCode - Short code
 * @returns Full short URL
 */
export function buildShortUrl(shortCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  return `${baseUrl}/d/${shortCode}`;
}

/**
 * Generate a short URL for an offer share
 * @param db - DatabaseService instance
 * @param offerId - Offer ID
 * @param offerSlug - Offer slug
 * @param expiresAt - Optional expiration
 * @returns Short URL
 */
export async function createOfferShareShortUrl(
  db: DatabaseService,
  offerId: number,
  offerSlug: string,
  expiresAt?: Date
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  const fullUrl = `${baseUrl}/offers/${offerSlug}`;

  const shortCode = await createShortUrl(db, fullUrl, 'offer', offerId, expiresAt);
  return buildShortUrl(shortCode);
}
