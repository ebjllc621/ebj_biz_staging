/**
 * AddAddonModal - Add add-on suite confirmation modal
 *
 * Allows user to select billing cycle and confirm add-on activation.
 * Immediate activation with prorated charge.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Add-On Management
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState } from 'react';
import type { AddonSuite } from '@core/types/subscription';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

export interface AddAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  addon: AddonSuite;
  listingId: number;
  subscriptionId: number;
  isPremium: boolean;
  onSuccess: () => void;
}

/**
 * AddAddonModal - Handles add-on suite activation workflow
 *
 * @component
 * @param {AddAddonModalProps} props - Component props
 * @returns {JSX.Element} Rendered add modal
 */
export function AddAddonModal({
  isOpen,
  onClose,
  addon,
  listingId,
  subscriptionId,
  isPremium,
  onSuccess
}: AddAddonModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeForPremium = isPremium && addon.suite_name === 'seo_scribe';

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/subscription/addons/add', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          subscriptionId,
          addonSuiteId: addon.id,
          billingCycle: isFreeForPremium ? 'monthly' : billingCycle
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add add-on');
      }

      onClose();
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to activate add-on');
      setLoading(false);
    }
  };

  const getPricing = (): number => {
    if (isFreeForPremium) return 0;
    return billingCycle === 'monthly'
      ? addon.pricing_monthly || 0
      : addon.pricing_annual || 0;
  };

  const getPricingLabel = (): string => {
    if (isFreeForPremium) return 'FREE';
    const pricing = getPricing();
    return billingCycle === 'monthly' ? `$${pricing}/month` : `$${pricing}/year`;
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${addon.display_name}`}
      size="medium"
    >
      <div className="p-6">
        {/* Features */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Features Included:</h3>
          <ul className="space-y-2">
            {addon.features.map((feature, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-700">
                <span className="text-green-600 mr-2">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Billing Cycle Selection */}
        {!isFreeForPremium && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Billing Cycle:
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-3 border-2 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="monthly"
                  checked={billingCycle === 'monthly'}
                  onChange={() => setBillingCycle('monthly')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <p className="font-semibold">Monthly</p>
                  <p className="text-sm text-gray-600">
                    ${addon.pricing_monthly}/month
                  </p>
                </div>
              </label>

              {addon.pricing_annual && (
                <label className="flex items-start p-3 border-2 rounded cursor-pointer hover:bg-gray-50 transition-colors border-green-300">
                  <input
                    type="radio"
                    value="annual"
                    checked={billingCycle === 'annual'}
                    onChange={() => setBillingCycle('annual')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Annual</p>
                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                        SAVE 15%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      ${addon.pricing_annual}/year (${(addon.pricing_annual / 12).toFixed(2)}/month)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Activation Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            {isFreeForPremium ? (
              <>
                <strong>Premium Benefit:</strong> This add-on is included FREE with your Premium plan.
                It will activate immediately upon confirmation.
              </>
            ) : (
              <>
                Add-on will activate immediately. You'll be charged <strong>{getPricingLabel()}</strong> starting today.
              </>
            )}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Activating...' : `Confirm - ${getPricingLabel()}`}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
