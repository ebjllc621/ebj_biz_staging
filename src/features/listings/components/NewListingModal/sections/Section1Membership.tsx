/**
 * NewListingModal - Section 1: Membership Selection
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 2 - Full Implementation
 *
 * FEATURES:
 * - Fetches subscription plans and addons from API
 * - Mock listing toggle (admin only)
 * - 4 tier cards with responsive grid
 * - 4 addon selection cards
 * - Premium tier includes 2 free addons
 * - Loading and error states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ListingTier, AddonSuite, TierLimits, AssignedUser } from '../../../types/listing-form.types';
import { TIER_LIMITS } from '../../../types/listing-form.types';
import { TierCard } from '../components/TierCard';
import { AddonCard } from '../components/AddonCard';
import { UserSearchAutocomplete } from '../shared/UserSearchAutocomplete/UserSearchAutocomplete';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPES
// ============================================================================

export interface Section1MembershipProps {
  selectedTier: ListingTier;
  selectedAddons: AddonSuite[];
  isMockListing: boolean;
  assignedUser: AssignedUser | null;
  onTierChange: (_tier: ListingTier) => void;
  onAddonToggle: (_addon: AddonSuite) => void;
  onMockToggle: (_value: boolean) => void;
  onAssignedUserChange: (_user: AssignedUser | null) => void;
  userRole: 'visitor' | 'general' | 'listing_member' | 'admin';
  tierLimits: TierLimits;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  tier: ListingTier;
  pricingMonthly: number;
  pricingAnnual: number;
}

interface AddonData {
  id: number;
  suiteName: AddonSuite;
  displayName: string;
  pricingMonthly: number;
  pricingAnnual: number;
}

// API returns snake_case, we transform to camelCase
interface ApiPlanRaw {
  id: number;
  name: string;
  tier: ListingTier;
  pricing_monthly: string;
  pricing_annual: string;
}

interface ApiAddonRaw {
  id: number;
  suite_name: string;
  display_name: string;
  pricing_monthly: string;
  pricing_annual: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    plans: ApiPlanRaw[];
    addons?: ApiAddonRaw[];
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Section1Membership({
  selectedTier,
  selectedAddons,
  isMockListing,
  assignedUser,
  onTierChange,
  onAddonToggle,
  onMockToggle,
  onAssignedUserChange,
  userRole,
}: Section1MembershipProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [addons, setAddons] = useState<AddonData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch plans and addons from API
  useEffect(() => {
    const fetchPricingData = async () => {
      try {
        const response = await fetch('/api/subscriptions/plans?includeAddons=true', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pricing data');
        }

        const result: ApiResponse = await response.json();

        if (result.success) {
          // Transform snake_case API response to camelCase for component
          // Filter out 'premium' tier - Premium Partners is highly selective
          // and managed through external measures, not self-service selection
          const transformedPlans = (result.data.plans || [])
            .filter((plan) => plan.tier !== 'premium')
            .map((plan) => ({
              id: plan.id,
              name: plan.name,
              tier: plan.tier,
              pricingMonthly: parseFloat(String(plan.pricing_monthly || 0)),
              pricingAnnual: parseFloat(String(plan.pricing_annual || 0)),
            }));
          setPlans(transformedPlans);
          const transformedAddons = (result.data.addons || []).map((addon) => ({
            id: addon.id,
            suiteName: addon.suite_name as AddonSuite,
            displayName: addon.display_name,
            pricingMonthly: parseFloat(String(addon.pricing_monthly || 0)),
            pricingAnnual: parseFloat(String(addon.pricing_annual || 0)),
          }));
          setAddons(transformedAddons);
        } else {
          throw new Error('Invalid API response');
        }
      } catch (err) {
        setError('Unable to load pricing information. Please try again.');
        ErrorService.capture('Error fetching pricing:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricingData();
  }, []);

  // Calculate which addons are free (Premium tier only)
  const calculateFreeAddons = useCallback((): AddonSuite[] => {
    const freeAddonLimit = TIER_LIMITS[selectedTier].freeAddons;

    if (freeAddonLimit === 0 || selectedAddons.length === 0) {
      return [];
    }

    // Sort selected addons by price (highest first) to maximize savings
    const sortedAddons = [...selectedAddons].sort((a, b) => {
      const priceA = addons.find(d => d.suiteName === a)?.pricingMonthly || 0;
      const priceB = addons.find(d => d.suiteName === b)?.pricingMonthly || 0;
      return priceB - priceA;
    });

    return sortedAddons.slice(0, freeAddonLimit);
  }, [selectedTier, selectedAddons, addons]);

  const freeAddons = calculateFreeAddons();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ed6437]"></div>
        <span className="ml-3 text-gray-600">Loading membership options...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
        >
          Reload page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin-Only Options */}
      {userRole === 'admin' && (
        <div className="space-y-4">
          {/* Mock Listing Toggle */}
          <div className="rounded-lg bg-gray-100 border border-gray-300 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#022641]">
                  Is this a mock listing?
                </span>
                <span className="text-xs bg-[#8d918d] text-white px-2 py-0.5 rounded">
                  Admin Only
                </span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mockListing"
                    checked={isMockListing}
                    onChange={() => onMockToggle(true)}
                    className="h-4 w-4 text-[#ed6437] focus:ring-[#ed6437]"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mockListing"
                    checked={!isMockListing}
                    onChange={() => onMockToggle(false)}
                    className="h-4 w-4 text-[#ed6437] focus:ring-[#ed6437]"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Assign to User */}
          <div className="rounded-lg bg-gray-100 border border-gray-300 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-[#022641]">
                Assign listing to user
              </span>
              <span className="text-xs bg-[#8d918d] text-white px-2 py-0.5 rounded">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Select a user to own this listing. The listing will be automatically claimed and approved.
            </p>
            <UserSearchAutocomplete
              selectedUser={assignedUser}
              onUserSelect={onAssignedUserChange}
            />
          </div>
        </div>
      )}

      {/* Tier Selection Section */}
      <div>
        <h3 className="text-lg font-semibold text-[#022641] mb-3">
          Select Your Membership Tier
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <TierCard
              key={plan.id}
              tier={plan}
              isSelected={selectedTier === plan.tier}
              onChange={() => onTierChange(plan.tier)}
              isPopular={plan.tier === 'preferred'}
            />
          ))}
        </div>
      </div>

      {/* Addon Selection Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#022641]">
            Optional Add-on Suites
          </h3>
        </div>
        <div className="space-y-3">
          {addons.map((addon) => (
            <AddonCard
              key={addon.id}
              addon={addon}
              isSelected={selectedAddons.includes(addon.suiteName)}
              onToggle={() => onAddonToggle(addon.suiteName)}
              isFree={freeAddons.includes(addon.suiteName)}
            />
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedAddons.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <h4 className="text-sm font-semibold text-[#022641] mb-2">
            Selected Add-ons ({selectedAddons.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedAddons.map((addonName) => {
              const addonData = addons.find(a => a.suiteName === addonName);
              const isFreeAddon = freeAddons.includes(addonName);

              return (
                <div
                  key={addonName}
                  className="flex items-center gap-2 bg-white border border-blue-300 rounded px-3 py-1.5"
                >
                  <span className="text-sm text-[#022641]">
                    {addonData?.displayName}
                  </span>
                  {isFreeAddon ? (
                    <span className="text-xs text-green-600 font-semibold">FREE</span>
                  ) : (
                    <span className="text-xs text-gray-600">
                      ${addonData?.pricingMonthly}/mo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
