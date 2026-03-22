/**
 * UpgradePlanModal - Plan Upgrade Confirmation Modal
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use BizModal wrapper
 * - Show pricing difference and new features
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import type { SubscriptionPlan } from '@features/dashboard/types';
import { Check, ArrowRight } from 'lucide-react';

export interface UpgradePlanModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Confirm upgrade callback */
  onConfirm: () => Promise<void>;
  /** Current plan */
  currentPlan: SubscriptionPlan;
  /** New plan */
  newPlan: SubscriptionPlan | null;
  /** Loading state */
  isLoading?: boolean;
}

export function UpgradePlanModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false
}: UpgradePlanModalProps) {
  if (!newPlan) return null;

  const priceDifference = (newPlan.pricing_monthly || 0) - (currentPlan.pricing_monthly || 0);
  const isUpgrade = priceDifference > 0;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handled by parent
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isUpgrade ? 'Upgrade Subscription' : 'Change Subscription'}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Plan Change Overview */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="text-xl font-bold text-gray-900">{currentPlan.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                ${currentPlan.pricing_monthly?.toFixed(2)}/mo
              </p>
            </div>

            <ArrowRight className="w-8 h-8 text-orange-600" />

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">New Plan</p>
              <p className="text-xl font-bold text-orange-600">{newPlan.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                ${newPlan.pricing_monthly?.toFixed(2)}/mo
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Difference */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            {isUpgrade ? (
              <>
                Your monthly cost will increase by{' '}
                <span className="font-bold text-orange-600">
                  ${Math.abs(priceDifference).toFixed(2)}
                </span>
              </>
            ) : (
              <>
                Your monthly cost will decrease by{' '}
                <span className="font-bold text-green-600">
                  ${Math.abs(priceDifference).toFixed(2)}
                </span>
              </>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Changes will take effect on your next billing cycle.
          </p>
        </div>

        {/* New Features */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {isUpgrade ? 'New Features' : 'Plan Includes'}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>
                {newPlan.features.categories === -1 ? 'Unlimited' : newPlan.features.categories} categories
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>{newPlan.features.images} images</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>{newPlan.features.videos} videos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>{newPlan.features.offers} offers</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600" />
              <span>{newPlan.features.events} events</span>
            </div>
            {newPlan.features.html_descriptions && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>HTML descriptions</span>
              </div>
            )}
            {newPlan.features.featured_placement && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>Featured placement</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : isUpgrade ? 'Confirm Upgrade' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default UpgradePlanModal;
