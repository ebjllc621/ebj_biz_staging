/**
 * Admin Package Types
 * Types for admin package and add-on management
 *
 * GOVERNANCE COMPLIANCE:
 * - Uses service layer types (ListingTier, TierLimits, AddonSuiteName)
 * - Matches database schema
 * - Admin-specific extensions for status/description fields
 *
 * @authority PHASE_1_BRAIN_PLAN.md
 * @phase Phase 1 - Admin API Routes
 */

import { ListingTier, AddonSuiteName, type TierLimits } from '@core/types/subscription';

/**
 * Package/addon status enum
 * Matches database ENUM('active', 'inactive', 'archived')
 */
export type PackageStatus = 'active' | 'inactive' | 'archived';

/**
 * Billing cycle type
 */
export type BillingType = 'monthly' | 'annual' | 'lifetime';

/**
 * Admin subscription plan interface with status/description fields
 */
export interface AdminSubscriptionPlan {
  id: number;
  tier: ListingTier;
  version: string;
  name: string;
  description: string | null;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: TierLimits;
  status: PackageStatus;
  is_displayed: boolean;
  effective_date: string;
  deprecated_date: string | null;
  created_at: string;
}

/**
 * Admin add-on suite interface with status/description fields
 */
export interface AdminAddonSuite {
  id: number;
  suite_name: AddonSuiteName;
  version: string;
  display_name: string;
  description: string | null;
  pricing_monthly: number | null;
  pricing_annual: number | null;
  features: string[];
  status: PackageStatus;
  is_displayed: boolean;
  effective_date: string;
  deprecated_date: string | null;
  created_at: string;
}

/**
 * Input for creating a new package
 */
export interface CreatePackageInput {
  tier: ListingTier;
  version: string;
  name: string;
  description?: string;
  pricing_monthly?: number;
  pricing_annual?: number;
  features: TierLimits;
  effective_date: string;
}

/**
 * Input for updating an existing package
 */
export interface UpdatePackageInput {
  name?: string;
  description?: string;
  pricing_monthly?: number;
  pricing_annual?: number;
  features?: Partial<TierLimits>;
}

/**
 * Input for creating a new add-on suite
 */
export interface CreateAddonInput {
  suite_name: AddonSuiteName;
  version: string;
  display_name: string;
  description?: string;
  pricing_monthly?: number;
  pricing_annual?: number;
  features: string[];
  effective_date: string;
}

/**
 * Input for updating an existing add-on suite
 */
export interface UpdateAddonInput {
  display_name?: string;
  description?: string;
  pricing_monthly?: number;
  pricing_annual?: number;
  features?: string[];
}

/**
 * Input for upgrading a package (creates new version)
 */
export interface UpgradePackageInput {
  pricing_monthly?: number;
  pricing_annual?: number;
  features?: Partial<TierLimits>;
  effective_date?: string;
}

/**
 * Input for upgrading an addon (creates new version)
 */
export interface UpgradeAddonInput {
  pricing_monthly?: number;
  pricing_annual?: number;
  features?: string[];
  effective_date?: string;
}
