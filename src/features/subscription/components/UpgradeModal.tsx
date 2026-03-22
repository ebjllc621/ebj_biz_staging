/**
 * UpgradeModal - Subscription upgrade confirmation modal
 *
 * Multi-step modal for upgrading subscription plans with:
 * - Feature comparison
 * - Billing cycle selection
 * - Payment placeholder
 * - Grandfathering acknowledgment
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Upgrade Flow
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState } from 'react';
import type { SubscriptionPlan } from '@core/types/subscription';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { TierBadge } from './TierBadge';
import { fetchWithCsrf } from '@core/utils/csrf';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  isGrandfathered: boolean;
  listingId: number;
  onSuccess: () => void;
}

/**
 * UpgradeModal - Handles subscription upgrade workflow
 *
 * @component
 * @param {UpgradeModalProps} props - Component props
 * @returns {JSX.Element} Rendered upgrade modal
 */
export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  newPlan,
  isGrandfathered,
  listingId,
  onSuccess
}: UpgradeModalProps) {
  const [step, setStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [acknowledgedGrandfathering, setAcknowledgedGrandfathering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setStep(1);
    setBillingCycle('monthly');
    setAcknowledgedGrandfathering(false);
    setError(null);
    onClose();
  };

  const handleConfirmUpgrade = async () => {
    if (isGrandfathered && !acknowledgedGrandfathering) {
      setError('Please acknowledge that you will lose your grandfathered status');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          newPlanId: newPlan.id,
          billingCycle
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upgrade failed');
      }

      setStep(4); // Success step
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upgrade subscription');
      setLoading(false);
    }
  };

  const getPricingDisplay = (plan: SubscriptionPlan, cycle: 'monthly' | 'annual'): string => {
    if (cycle === 'monthly') {
      return plan.pricing_monthly ? `$${plan.pricing_monthly}/month` : 'FREE';
    }
    return plan.pricing_annual ? `$${plan.pricing_annual}/year` : 'FREE';
  };

  const getCostDifference = (): number => {
    if (billingCycle === 'monthly') {
      return (newPlan.pricing_monthly || 0) - (currentPlan.pricing_monthly || 0);
    }
    return (newPlan.pricing_annual || 0) - (currentPlan.pricing_annual || 0);
  };

  const renderStep1 = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Plan Comparison</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Current Plan */}
        <div className="border border-gray-300 rounded p-4">
          <p className="text-sm text-gray-600 mb-2">Current Plan</p>
          <div className="flex items-center gap-2 mb-3">
            <TierBadge tier={currentPlan.tier} size="small" />
            <p className="font-semibold">{currentPlan.name}</p>
          </div>
          <p className="text-gray-700">{getPricingDisplay(currentPlan, billingCycle)}</p>
        </div>

        {/* New Plan */}
        <div className="border border-blue-500 rounded p-4 bg-blue-50">
          <p className="text-sm text-blue-600 mb-2">New Plan</p>
          <div className="flex items-center gap-2 mb-3">
            <TierBadge tier={newPlan.tier} size="small" />
            <p className="font-semibold">{newPlan.name}</p>
          </div>
          <p className="text-gray-900 font-semibold">{getPricingDisplay(newPlan, billingCycle)}</p>
        </div>
      </div>

      {/* Feature Additions */}
      <div className="mb-6">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">New Features You'll Get:</h4>
        <ul className="space-y-1 text-sm text-green-700">
          {newPlan.features.categories > currentPlan.features.categories && (
            <li>✓ More categories ({newPlan.features.categories === -1 ? 'Unlimited' : newPlan.features.categories} vs {currentPlan.features.categories})</li>
          )}
          {newPlan.features.images > currentPlan.features.images && (
            <li>✓ More images ({newPlan.features.images} vs {currentPlan.features.images})</li>
          )}
          {newPlan.features.videos > currentPlan.features.videos && (
            <li>✓ More videos ({newPlan.features.videos} vs {currentPlan.features.videos})</li>
          )}
          {newPlan.features.html_descriptions && !currentPlan.features.html_descriptions && (
            <li>✓ HTML Editor access</li>
          )}
          {newPlan.features.featured_placement && !currentPlan.features.featured_placement && (
            <li>✓ Featured Placement</li>
          )}
        </ul>
      </div>

      {/* Grandfathered Warning */}
      {isGrandfathered && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-sm text-yellow-800 mb-2">
            ⚠️ <strong>Warning: You will lose your grandfathered status</strong>
            <br />
            Your current plan ({currentPlan.name}) is no longer available.
            If you upgrade, you will not be able to downgrade back to this plan.
          </p>
          <label className="flex items-center mt-3">
            <input
              type="checkbox"
              checked={acknowledgedGrandfathering}
              onChange={(e) => setAcknowledgedGrandfathering(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">I understand and accept losing my grandfathered status</span>
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Cancel
        </button>
        <button
          onClick={() => setStep(2)}
          disabled={isGrandfathered && !acknowledgedGrandfathering}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Select Billing Cycle</h3>

      <div className="space-y-4 mb-6">
        <label className="flex items-start p-4 border-2 rounded cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            value="monthly"
            checked={billingCycle === 'monthly'}
            onChange={() => setBillingCycle('monthly')}
            className="mt-1 mr-3"
          />
          <div className="flex-1">
            <p className="font-semibold">Monthly Billing</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {newPlan.pricing_monthly ? `$${newPlan.pricing_monthly}` : 'FREE'}
              <span className="text-sm font-normal text-gray-600">/month</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">Billed monthly, cancel anytime</p>
          </div>
        </label>

        {newPlan.pricing_annual && (
          <label className="flex items-start p-4 border-2 rounded cursor-pointer hover:bg-gray-50 transition-colors border-green-500 bg-green-50">
            <input
              type="radio"
              value="annual"
              checked={billingCycle === 'annual'}
              onChange={() => setBillingCycle('annual')}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Annual Billing</p>
                <span className="px-2 py-1 bg-green-600 text-white text-xs rounded font-semibold">SAVE 15%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${newPlan.pricing_annual}
                <span className="text-sm font-normal text-gray-600">/year</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Billed annually (${(newPlan.pricing_annual / 12).toFixed(2)}/month equivalent)
              </p>
            </div>
          </label>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        <p className="text-sm text-blue-800">
          You'll be charged <strong>${getCostDifference().toFixed(2)}</strong> today for the upgrade.
          {billingCycle === 'annual' && ' Your annual billing will begin on your next renewal date.'}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Payment Confirmation</h3>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-600 mb-2">Upgrading to:</p>
        <p className="text-xl font-bold">{newPlan.name}</p>
        <p className="text-lg text-gray-900 mt-1">{getPricingDisplay(newPlan, billingCycle)}</p>
      </div>

      {/* Payment Placeholder (Future Stripe Integration) */}
      <div className="mb-6 p-6 border-2 border-dashed border-gray-300 rounded bg-gray-50 text-center">
        <p className="text-gray-600 mb-2">💳 Payment Integration Placeholder</p>
        <p className="text-sm text-gray-500">
          Stripe/PayPal payment form will be integrated in future phase.
          <br />
          For now, upgrade will be processed immediately upon confirmation.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => setStep(2)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" disabled={loading}>
          Back
        </button>
        <button
          onClick={handleConfirmUpgrade}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Confirm Upgrade - $${getCostDifference().toFixed(2)}`}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="p-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h3 className="text-2xl font-bold text-green-700 mb-2">Upgrade Successful!</h3>
      <p className="text-gray-700 mb-4">
        Your plan has been upgraded to <strong>{newPlan.name}</strong>.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        All new features are now unlocked and ready to use.
      </p>
      <button
        onClick={() => {
          handleClose();
          onSuccess();
        }}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Updated Subscription
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 4 ? 'Success' : 'Upgrade Subscription'}
      size="large"
    >
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </BizModal>
  );
}
