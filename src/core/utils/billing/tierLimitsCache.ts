/**
 * TierLimitsCache - Database-driven tier limits with 5-minute TTL cache
 *
 * Replaces hardcoded TIER_LIMITS constants in ListingService and EventService.
 * Loads from subscription_plans.features JSON column.
 * Supports override_features from listing_subscriptions.
 *
 * @tier STANDARD
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 9
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import type { DatabaseService } from '@core/services/DatabaseService';
import { safeJsonParse, bigIntToNumber } from '@core/utils/bigint';
import type { TierLimits } from '@core/types/subscription';

// ===========================================================================
// Cache State
// ===========================================================================

let cache: { data: Record<string, TierLimits>; loadedAt: number } | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const DEFAULT_LIMITS: TierLimits = {
  categories: 0,
  images: 0,
  videos: 0,
  offers: 0,
  events: 0,
};

// ===========================================================================
// Internal Helpers
// ===========================================================================

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL_MS;
}

function getDb(db?: DatabaseService): DatabaseService {
  return db ?? getDatabaseService();
}

// ===========================================================================
// Public API
// ===========================================================================

/**
 * Load all tier limits from subscription_plans.features.
 * Uses 5-minute TTL cache to avoid repeated DB hits.
 *
 * @param db - Optional DatabaseService instance (falls back to singleton)
 * @returns Record keyed by tier name
 */
export async function getAllTierLimits(
  db?: DatabaseService
): Promise<Record<string, TierLimits>> {
  if (isCacheValid()) {
    return cache!.data;
  }

  const database = getDb(db);

  const result = await database.query<{ tier: string; features: TierLimits | string }>(
    "SELECT tier, features FROM subscription_plans WHERE status = 'active'"
  );

  const data: Record<string, TierLimits> = {};

  for (const row of result.rows) {
    const features = safeJsonParse<TierLimits>(row.features as string, DEFAULT_LIMITS);
    data[row.tier] = features;
  }

  cache = { data, loadedAt: Date.now() };
  return data;
}

/**
 * Get tier limits for a specific tier name.
 *
 * @param tier - Tier name (e.g. 'essentials', 'plus', 'preferred', 'premium')
 * @param db  - Optional DatabaseService instance
 * @returns TierLimits for the tier, or DEFAULT_LIMITS if not found
 */
export async function getTierLimitsForTier(
  tier: string,
  db?: DatabaseService
): Promise<TierLimits> {
  const limits = await getAllTierLimits(db);
  return limits[tier] ?? { ...DEFAULT_LIMITS };
}

/**
 * Get effective limits for a specific listing, merging subscription
 * override_features on top of the base plan limits.
 *
 * @param listingId - Listing ID
 * @param db        - Optional DatabaseService instance
 * @returns Merged TierLimits (base + overrides)
 */
export async function getEffectiveLimits(
  listingId: number,
  db?: DatabaseService
): Promise<TierLimits> {
  const database = getDb(db);

  // Resolve the listing's tier
  const listingResult = await database.query<{ tier: string }>(
    'SELECT tier FROM listings WHERE id = ?',
    [listingId]
  );

  const tier = listingResult.rows[0]?.tier ?? 'essentials';
  const baseLimits = await getTierLimitsForTier(tier, database);

  // Check for active subscription overrides
  const subResult = await database.query<{
    override_features: Partial<TierLimits> | string | null;
  }>(
    "SELECT override_features FROM listing_subscriptions WHERE listing_id = ? AND status = 'active' LIMIT 1",
    [listingId]
  );

  if (subResult.rows.length === 0) {
    return { ...baseLimits };
  }

  const raw = subResult.rows[0]?.override_features;
  if (!raw) {
    return { ...baseLimits };
  }

  const overrides = safeJsonParse<Partial<TierLimits>>(raw as string, {});
  return { ...baseLimits, ...overrides };
}

/**
 * Invalidate the in-memory cache.
 * Call after subscription_plans records are created or updated.
 */
export function clearTierLimitsCache(): void {
  cache = null;
}
