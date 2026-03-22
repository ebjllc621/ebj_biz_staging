/**
 * CurrentPlanCard - Display current subscription plan details
 *
 * Shows plan name, tier badge, pricing, renewal date, and grandfathered status.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Plan Selection Interface
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import type { SubscriptionPlan } from '@core/types/subscription';
import { TierBadge } from './TierBadge';

export interface CurrentPlanCardProps {
  plan: SubscriptionPlan;
  isGrandfathered: boolean;
  nextBilling: string | Date | null;
}

/**
 * CurrentPlanCard - Displays current subscription plan with details
 *
 * @component
 * @param {CurrentPlanCardProps} props - Component props
 * @returns {JSX.Element} Rendered current plan card
 *
 * @example
 * ```tsx
 * <CurrentPlanCard
 *   plan={currentPlan}
 *   isGrandfathered={false}
 *   nextBilling={new Date('2025-12-31')}
 * />
 * ```
 */
export function CurrentPlanCard({ plan, isGrandfathered, nextBilling }: CurrentPlanCardProps) {
  const formatDate = (date: string | Date | null): string => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPricingDisplay = (): string => {
    if (!plan.pricing_monthly) {
      return 'FREE';
    }
    return `$${plan.pricing_monthly.toFixed(2)}/month`;
  };

  const getAnnualPricingDisplay = (): string | null => {
    if (!plan.pricing_annual) {
      return null;
    }
    return `$${plan.pricing_annual.toFixed(2)}/year`;
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 mb-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <TierBadge tier={plan.tier} size="medium" />
          </div>
          <div className="space-y-1">
            <p className="text-lg text-gray-700 font-semibold">
              {getPricingDisplay()}
            </p>
            {getAnnualPricingDisplay() && (
              <p className="text-sm text-gray-600">
                or {getAnnualPricingDisplay()} (Save 15%)
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          {nextBilling && (
            <div className="text-sm text-gray-600">
              <p className="font-medium">Next Billing</p>
              <p>{formatDate(nextBilling)}</p>
            </div>
          )}
        </div>
      </div>

      {isGrandfathered && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔒</span>
            <div>
              <p className="font-semibold text-blue-900">Grandfathered Plan</p>
              <p className="text-sm text-blue-800 mt-1">
                Your current plan is no longer available to new users. Changing plans will forfeit this status,
                and you will not be able to return to this plan.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Plan Features:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Categories</p>
            <p className="font-semibold">
              {plan.features.categories === -1 ? 'Unlimited' : plan.features.categories}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Images</p>
            <p className="font-semibold">{plan.features.images}</p>
          </div>
          <div>
            <p className="text-gray-600">Videos</p>
            <p className="font-semibold">{plan.features.videos}</p>
          </div>
          <div>
            <p className="text-gray-600">Offers</p>
            <p className="font-semibold">{plan.features.offers}</p>
          </div>
          <div>
            <p className="text-gray-600">Events</p>
            <p className="font-semibold">{plan.features.events}</p>
          </div>
          <div>
            <p className="text-gray-600">HTML Editor</p>
            <p className="font-semibold">
              {plan.features.html_descriptions ? '✓' : '✗'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Featured Placement</p>
            <p className="font-semibold">
              {plan.features.featured_placement ? '✓' : '✗'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Attachments</p>
            <p className="font-semibold">
              {plan.features.attachments === -1 ? 'Unlimited' : (plan.features.attachments || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
