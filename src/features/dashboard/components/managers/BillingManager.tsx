/**
 * BillingManager - Main Billing Management Container
 *
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use useListingSubscription hook
 * - MUST use BizModal for all modals
 */
'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingSubscription } from '@features/dashboard/hooks/useListingSubscription';
import type { SubscriptionPlan, AddonSuite } from '@features/dashboard/types';
import { CurrentPlanCard } from './billing/CurrentPlanCard';
import { PlanComparisonGrid } from './billing/PlanComparisonGrid';
import { UpgradePlanModal } from './billing/UpgradePlanModal';
import { ManageAddonsModal } from './billing/ManageAddonsModal';
import { AlertCircle, Loader2, CreditCard } from 'lucide-react';

export function BillingManager() {
  const { selectedListingId } = useListingContext();
  const {
    data,
    isLoading,
    error,
    upgradePlan,
    addAddon,
    removeAddon,
    actionLoading
  } = useListingSubscription(selectedListingId);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isAddonsModalOpen, setIsAddonsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    await upgradePlan(selectedPlan.id);
  };

  const handleAddAddon = async (addon: AddonSuite) => {
    try {
      await addAddon(addon.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add add-on');
    }
  };

  const handleRemoveAddon = async (addon: AddonSuite) => {
    if (confirm(`Remove ${addon.display_name}? You can add it back at any time.`)) {
      try {
        await removeAddon(addon.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to remove add-on');
      }
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Billing Information</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!data || !data.subscription) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
          <CreditCard className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
        <p className="text-gray-600">Contact support to activate a subscription plan.</p>
      </div>
    );
  }

  // Find current plan
  const currentPlan = data.availablePlans.find((p) => p.id === data.subscription?.plan_id);

  if (!currentPlan) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-900">Unable to load current plan details.</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-900 font-semibold">Something went wrong loading billing</p>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Current Plan Card */}
        <CurrentPlanCard
          plan={currentPlan}
          subscription={data.subscription}
          activeAddons={data.activeAddons}
          availableAddons={data.availableAddons}
          onUpgrade={() => setIsUpgradeModalOpen(true)}
          onManageAddons={() => setIsAddonsModalOpen(true)}
        />

        {/* Plan Comparison Grid */}
        <PlanComparisonGrid
          plans={data.availablePlans}
          currentTier={currentPlan.tier}
          onSelectPlan={handleSelectPlan}
        />

        {/* Upgrade Plan Modal */}
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onConfirm={handleConfirmUpgrade}
          currentPlan={currentPlan}
          newPlan={selectedPlan}
          isLoading={actionLoading}
        />

        {/* Manage Add-ons Modal */}
        <ManageAddonsModal
          isOpen={isAddonsModalOpen}
          onClose={() => setIsAddonsModalOpen(false)}
          availableAddons={data.availableAddons}
          activeAddons={data.activeAddons}
          onAddAddon={handleAddAddon}
          onRemoveAddon={handleRemoveAddon}
          isLoading={actionLoading}
        />
      </div>
    </ErrorBoundary>
  );
}

export default BillingManager;
