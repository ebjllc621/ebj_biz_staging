/**
 * CurrentPlanCard - Display Current Subscription Plan
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Shows current tier, features, active add-ons, and renewal date
 */
'use client';

import React from 'react';
import type { SubscriptionPlan, ListingSubscription, ListingSubscriptionAddon, AddonSuite } from '@features/dashboard/types';
import { Check, Calendar, DollarSign } from 'lucide-react';

export interface CurrentPlanCardProps {
  /** Current plan */
  plan: SubscriptionPlan;
  /** Current subscription */
  subscription: ListingSubscription;
  /** Active add-ons */
  activeAddons: ListingSubscriptionAddon[];
  /** Available add-ons for name lookup */
  availableAddons: AddonSuite[];
  /** Upgrade plan callback */
  onUpgrade: () => void;
  /** Manage add-ons callback */
  onManageAddons: () => void;
}

export function CurrentPlanCard({
  plan,
  subscription,
  activeAddons,
  availableAddons,
  onUpgrade,
  onManageAddons
}: CurrentPlanCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAddonName = (addonId: number): string => {
    const addon = availableAddons.find((a) => a.id === addonId);
    return addon?.display_name || 'Unknown Add-on';
  };

  const getAddonPrice = (addonId: number): number => {
    const addon = availableAddons.find((a) => a.id === addonId);
    return addon?.pricing_monthly || 0;
  };

  const totalAddOnCost = activeAddons.reduce(
    (sum, addon) => sum + getAddonPrice(addon.addon_suite_id),
    0
  );

  const totalMonthlyCost = (plan.pricing_monthly || 0) + totalAddOnCost;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600 text-white rounded-full text-sm font-semibold mb-2">
            Current Plan
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
          <p className="text-lg text-gray-700 mt-1">
            ${plan.pricing_monthly?.toFixed(2)}/month
          </p>
        </div>
      </div>

      {/* Renewal Info */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>
            Renews: <span className="font-semibold">{formatDate(subscription.renews_at)}</span>
          </span>
        </div>
        {subscription.is_grandfathered && (
          <p className="text-xs text-orange-600 mt-2 font-medium">
            Grandfathered Plan - Locked pricing
          </p>
        )}
      </div>

      {/* Features */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Plan Features</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{plan.features.categories === -1 ? 'Unlimited' : plan.features.categories} categories</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{plan.features.images} images</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{plan.features.videos} videos</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{plan.features.offers} offers</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{plan.features.events} events</span>
          </div>
        </div>
      </div>

      {/* Active Add-ons */}
      {activeAddons.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Active Add-ons</h4>
          <div className="space-y-2">
            {activeAddons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <span className="text-sm font-medium text-gray-900">
                  {getAddonName(addon.addon_suite_id)}
                </span>
                <span className="text-sm text-gray-600">
                  ${getAddonPrice(addon.addon_suite_id).toFixed(2)}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total Cost */}
      <div className="bg-white rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Total Monthly Cost</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            ${totalMonthlyCost.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full px-4 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
        >
          Upgrade Plan
        </button>
        <button
          type="button"
          onClick={onManageAddons}
          className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Manage Add-ons
        </button>
      </div>
    </div>
  );
}

export default CurrentPlanCard;
