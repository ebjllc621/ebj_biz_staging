/**
 * PlanComparisonGrid - Grid Comparison of Available Plans
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Shows all available tiers with feature comparison
 */
'use client';

import React from 'react';
import type { SubscriptionPlan, ListingTier } from '@features/dashboard/types';
import { Check, X } from 'lucide-react';

export interface PlanComparisonGridProps {
  /** Available plans */
  plans: SubscriptionPlan[];
  /** Current tier */
  currentTier: ListingTier;
  /** Select plan callback */
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

const tierOrder: Record<ListingTier, number> = {
  essentials: 1,
  plus: 2,
  preferred: 3,
  premium: 4
};

export function PlanComparisonGrid({
  plans,
  currentTier,
  onSelectPlan
}: PlanComparisonGridProps) {
  // Sort plans by tier order
  const sortedPlans = [...plans].sort(
    (a, b) => tierOrder[a.tier as ListingTier] - tierOrder[b.tier as ListingTier]
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedPlans.map((plan) => {
          const isCurrentPlan = plan.tier === currentTier;
          const isHigherTier = tierOrder[plan.tier as ListingTier] > tierOrder[currentTier];

          return (
            <div
              key={plan.id}
              className={`
                relative bg-white rounded-lg border-2 p-6 transition-all
                ${
                  isCurrentPlan
                    ? 'border-orange-600 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300 hover:shadow-md'
                }
              `}
            >
              {/* Current Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 bg-orange-600 text-white rounded-full text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                <div className="text-3xl font-bold text-gray-900">
                  ${plan.pricing_monthly?.toFixed(0)}
                  <span className="text-base font-normal text-gray-600">/mo</span>
                </div>
                {plan.pricing_annual && (
                  <p className="text-sm text-gray-600 mt-1">
                    ${plan.pricing_annual.toFixed(0)}/year
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">
                    {plan.features.categories === -1 ? 'Unlimited' : plan.features.categories} categories
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{plan.features.images} images</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{plan.features.videos} videos</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{plan.features.offers} offers</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{plan.features.events} events</span>
                </div>
                {plan.features.html_descriptions ? (
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">HTML descriptions</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-400">HTML descriptions</span>
                  </div>
                )}
                {plan.features.featured_placement ? (
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">Featured placement</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-400">Featured placement</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                disabled={isCurrentPlan}
                className={`
                  w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors
                  ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isHigherTier
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {isCurrentPlan
                  ? 'Current Plan'
                  : isHigherTier
                  ? 'Upgrade to ' + plan.name
                  : 'Downgrade to ' + plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlanComparisonGrid;
