/**
 * PlanComparisonTable - Side-by-side subscription plan comparison
 *
 * Displays all 4 tiers with feature matrix, pricing, and upgrade/downgrade buttons.
 * Integrates with upgrade/downgrade modals for plan changes.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Plan Selection Interface
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@core/types/subscription';
import { TierBadge } from './TierBadge';
import { FeatureRow } from './FeatureRow';
import { UpgradeModal } from './UpgradeModal';
import { DowngradeModal } from './DowngradeModal';

export interface PlanComparisonTableProps {
  currentPlan: SubscriptionPlan;
  availablePlans: SubscriptionPlan[];
  isGrandfathered: boolean;
  listingId: number;
}

/**
 * PlanComparisonTable - Displays side-by-side comparison of subscription plans
 *
 * Shows all 4 tiers (Essentials, Plus, Preferred, Premium) with feature matrix,
 * pricing, and upgrade/downgrade action buttons. Handles grandfathered plan warnings.
 *
 * @component
 * @param {PlanComparisonTableProps} props - Component props
 * @returns {JSX.Element} Rendered plan comparison table
 *
 * @example
 * ```tsx
 * <PlanComparisonTable
 *   currentPlan={plan}
 *   availablePlans={plans}
 *   isGrandfathered={false}
 *   listingId={123}
 * />
 * ```
 */
export function PlanComparisonTable({
  currentPlan,
  availablePlans,
  isGrandfathered,
  listingId
}: PlanComparisonTableProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Tier ordering for upgrade/downgrade determination
  const tierOrder = ['essentials', 'plus', 'preferred', 'premium'];

  const handlePlanChange = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);

    const currentIndex = tierOrder.indexOf(currentPlan.tier);
    const newIndex = tierOrder.indexOf(plan.tier);

    if (newIndex > currentIndex) {
      setUpgradeModalOpen(true);
    } else {
      setDowngradeModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setUpgradeModalOpen(false);
    setDowngradeModalOpen(false);
    setSelectedPlan(null);
  };

  const handleUpgradeSuccess = () => {
    // Reload page to reflect new plan
    window.location.reload();
  };

  const handleDowngradeSuccess = () => {
    // Reload page to reflect downgrade schedule
    window.location.reload();
  };

  return (
    <>
      {/* Grandfathered Warning */}
      {isGrandfathered && (
        <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900">Warning: Grandfathered Plan Status</p>
              <p className="text-sm text-yellow-800 mt-1">
                Changing plans will forfeit your grandfathered status. You will not be able to return to your current plan once you upgrade or downgrade.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison Table */}
      <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="p-4 text-left font-semibold text-gray-700">Feature</th>
              {availablePlans.map((plan) => (
                <th key={plan.id} className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <TierBadge tier={plan.tier} size="medium" />
                    <div className="mt-1">
                      <p className="font-bold text-lg text-gray-900">
                        {plan.pricing_monthly ? `$${plan.pricing_monthly}` : 'FREE'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {plan.pricing_monthly ? '/month' : ''}
                      </p>
                    </div>
                    {plan.pricing_annual && (
                      <div className="text-xs text-gray-600">
                        <p>or ${plan.pricing_annual}/year</p>
                        <p className="text-green-600 font-semibold">(Save 15%)</p>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <FeatureRow
              feature="Categories"
              values={availablePlans.map((p) =>
                p.features.categories === -1 ? 'Unlimited' : p.features.categories
              )}
            />
            <FeatureRow
              feature="Images"
              values={availablePlans.map((p) => p.features.images)}
            />
            <FeatureRow
              feature="Videos"
              values={availablePlans.map((p) => p.features.videos)}
            />
            <FeatureRow
              feature="Offers"
              values={availablePlans.map((p) => p.features.offers)}
            />
            <FeatureRow
              feature="Events"
              values={availablePlans.map((p) => p.features.events)}
            />
            <FeatureRow
              feature="HTML Editor"
              values={availablePlans.map((p) => Boolean(p.features.html_descriptions))}
            />
            <FeatureRow
              feature="Attachments"
              values={availablePlans.map((p) =>
                p.features.attachments === -1 ? 'Unlimited' : (p.features.attachments || 0)
              )}
            />
            <FeatureRow
              feature="Featured Placement"
              values={availablePlans.map((p) => Boolean(p.features.featured_placement))}
            />
            <FeatureRow
              feature="Projects"
              values={availablePlans.map((p) => p.features.projects || 0)}
            />
            <FeatureRow
              feature="Job Postings"
              values={availablePlans.map((p) =>
                p.features.job_postings === -1 ? 'Unlimited' : (p.features.job_postings || 0)
              )}
            />
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td className="p-4"></td>
              {availablePlans.map((plan) => {
                const isCurrent = plan.id === currentPlan.id;
                const currentIndex = tierOrder.indexOf(currentPlan.tier);
                const planIndex = tierOrder.indexOf(plan.tier);
                const isUpgrade = planIndex > currentIndex;

                return (
                  <td key={plan.id} className="p-4 text-center">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-gray-200 text-gray-500 rounded font-semibold cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanChange(plan)}
                        className={`w-full px-4 py-2 rounded font-semibold transition-colors ${
                          isUpgrade
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {isUpgrade ? 'Upgrade' : 'Downgrade'}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modals */}
      {selectedPlan && (
        <>
          <UpgradeModal
            isOpen={upgradeModalOpen}
            onClose={handleModalClose}
            currentPlan={currentPlan}
            newPlan={selectedPlan}
            isGrandfathered={isGrandfathered}
            listingId={listingId}
            onSuccess={handleUpgradeSuccess}
          />

          <DowngradeModal
            isOpen={downgradeModalOpen}
            onClose={handleModalClose}
            currentPlan={currentPlan}
            newPlan={selectedPlan}
            isGrandfathered={isGrandfathered}
            listingId={listingId}
            onSuccess={handleDowngradeSuccess}
          />
        </>
      )}
    </>
  );
}
