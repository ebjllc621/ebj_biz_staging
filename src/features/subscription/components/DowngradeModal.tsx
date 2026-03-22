/**
 * DowngradeModal - Subscription downgrade confirmation modal
 *
 * Multi-step modal for downgrading subscription plans with:
 * - Feature loss warning
 * - Usage validation (blocks if current usage exceeds new tier limits)
 * - Deferred effective date
 * - Grandfathering acknowledgment
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Downgrade Flow
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState, useEffect } from 'react';
import type { SubscriptionPlan } from '@core/types/subscription';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { TierBadge } from './TierBadge';
import { fetchWithCsrf } from '@core/utils/csrf';

export interface DowngradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  isGrandfathered: boolean;
  listingId: number;
  onSuccess: () => void;
}

interface ValidationResult {
  allowed: boolean;
  violations: string[];
}

/**
 * DowngradeModal - Handles subscription downgrade workflow with validation
 *
 * @component
 * @param {DowngradeModalProps} props - Component props
 * @returns {JSX.Element} Rendered downgrade modal
 */
export function DowngradeModal({
  isOpen,
  onClose,
  currentPlan,
  newPlan,
  isGrandfathered,
  listingId,
  onSuccess
}: DowngradeModalProps) {
  const [step, setStep] = useState(1);
  const [acknowledgedGrandfathering, setAcknowledgedGrandfathering] = useState(false);
  const [acknowledgedFeatureLoss, setAcknowledgedFeatureLoss] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ allowed: true, violations: [] });
  const [error, setError] = useState<string | null>(null);

  // Validate downgrade when modal opens
  useEffect(() => {
    if (isOpen) {
      validateDowngrade();
    }
  }, [isOpen, listingId, newPlan.id]);

  const validateDowngrade = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/subscription/validate-downgrade?listingId=${listingId}&newPlanId=${newPlan.id}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setValidation(data.data);
      } else {
        setValidation({ allowed: false, violations: [data.error || 'Validation failed'] });
      }
    } catch (err: unknown) {
      setValidation({ allowed: false, violations: ['Failed to validate downgrade'] });
    } finally {
      setValidating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setAcknowledgedGrandfathering(false);
    setAcknowledgedFeatureLoss(false);
    setError(null);
    onClose();
  };

  const handleConfirmDowngrade = async () => {
    if (isGrandfathered && !acknowledgedGrandfathering) {
      setError('Please acknowledge that you will lose your grandfathered status');
      return;
    }

    if (!acknowledgedFeatureLoss) {
      setError('Please acknowledge the feature losses');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/subscription/downgrade', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          newPlanId: newPlan.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Downgrade failed');
      }

      setStep(3); // Success step
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to downgrade subscription');
      setLoading(false);
    }
  };

  const getPricingDisplay = (plan: SubscriptionPlan): string => {
    return plan.pricing_monthly ? `$${plan.pricing_monthly}/month` : 'FREE';
  };

  const getFeatureLosses = (): string[] => {
    const losses: string[] = [];

    if (currentPlan.features.categories > newPlan.features.categories) {
      losses.push(`Categories reduced (${currentPlan.features.categories} → ${newPlan.features.categories})`);
    }
    if (currentPlan.features.images > newPlan.features.images) {
      losses.push(`Images reduced (${currentPlan.features.images} → ${newPlan.features.images})`);
    }
    if (currentPlan.features.videos > newPlan.features.videos) {
      losses.push(`Videos reduced (${currentPlan.features.videos} → ${newPlan.features.videos})`);
    }
    if (currentPlan.features.html_descriptions && !newPlan.features.html_descriptions) {
      losses.push('HTML Editor access removed');
    }
    if (currentPlan.features.featured_placement && !newPlan.features.featured_placement) {
      losses.push('Featured Placement removed');
    }

    return losses;
  };

  const renderStep1 = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Downgrade Warning</h3>

      {/* Validation Loading */}
      {validating && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">Validating current usage...</p>
        </div>
      )}

      {/* Validation Violations */}
      {!validating && !validation.allowed && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-900 mb-2">⚠️ Cannot Downgrade - Usage Exceeds New Tier Limits</p>
          <ul className="space-y-1 text-sm text-red-800">
            {validation.violations.map((violation, index) => (
              <li key={index}>• {violation}</li>
            ))}
          </ul>
          <p className="text-sm text-red-700 mt-3">
            Please reduce your usage to meet the new tier limits before downgrading.
          </p>
        </div>
      )}

      {/* Plan Comparison */}
      {!validating && validation.allowed && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Current Plan */}
            <div className="border border-gray-300 rounded p-4">
              <p className="text-sm text-gray-600 mb-2">Current Plan</p>
              <div className="flex items-center gap-2 mb-3">
                <TierBadge tier={currentPlan.tier} size="small" />
                <p className="font-semibold">{currentPlan.name}</p>
              </div>
              <p className="text-gray-700">{getPricingDisplay(currentPlan)}</p>
            </div>

            {/* New Plan */}
            <div className="border border-gray-400 rounded p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">Downgrading To</p>
              <div className="flex items-center gap-2 mb-3">
                <TierBadge tier={newPlan.tier} size="small" />
                <p className="font-semibold">{newPlan.name}</p>
              </div>
              <p className="text-gray-900 font-semibold">{getPricingDisplay(newPlan)}</p>
            </div>
          </div>

          {/* Deferred Notice */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800">
              ⏱️ <strong>Downgrade will take effect at the end of your current billing period.</strong>
              <br />
              You will continue to have access to all current features until then.
            </p>
          </div>

          {/* Feature Losses */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Features You Will Lose:</h4>
            <ul className="space-y-1 text-sm text-red-700">
              {getFeatureLosses().map((loss, index) => (
                <li key={index}>✗ {loss}</li>
              ))}
            </ul>
          </div>

          {/* Grandfathered Warning */}
          {isGrandfathered && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ <strong>Warning: You will lose your grandfathered status</strong>
                <br />
                Your current plan ({currentPlan.name}) is no longer available.
                If you downgrade, you will not be able to upgrade back to this plan.
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

          {/* Feature Loss Acknowledgment */}
          <label className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded mb-4">
            <input
              type="checkbox"
              checked={acknowledgedFeatureLoss}
              onChange={(e) => setAcknowledgedFeatureLoss(e.target.checked)}
              className="mt-1 mr-3"
            />
            <span className="text-sm">I understand and accept the feature losses listed above</span>
          </label>
        </>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
          Cancel
        </button>
        {!validating && validation.allowed && (
          <button
            onClick={() => setStep(2)}
            disabled={isGrandfathered && !acknowledgedGrandfathering || !acknowledgedFeatureLoss}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Confirm Downgrade</h3>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-sm text-gray-600 mb-2">Downgrading to:</p>
        <p className="text-xl font-bold">{newPlan.name}</p>
        <p className="text-lg text-gray-900 mt-1">{getPricingDisplay(newPlan)}</p>
      </div>

      <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          Your downgrade will be scheduled and take effect at the end of your current billing period.
          You will continue to have full access to your current plan features until then.
        </p>
      </div>

      <p className="text-center text-gray-700 mb-6">
        Are you sure you want to downgrade to <strong>{newPlan.name}</strong>?
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" disabled={loading}>
          Back
        </button>
        <button
          onClick={handleConfirmDowngrade}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Confirm Downgrade'}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="p-6 text-center">
      <div className="text-5xl mb-4">⏱️</div>
      <h3 className="text-2xl font-bold text-orange-700 mb-2">Downgrade Scheduled</h3>
      <p className="text-gray-700 mb-4">
        Your plan will be downgraded to <strong>{newPlan.name}</strong> at the end of your current billing period.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        You will continue to have access to all current plan features until the effective date.
      </p>
      <button
        onClick={() => {
          handleClose();
          onSuccess();
        }}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Subscription
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 3 ? 'Downgrade Scheduled' : 'Downgrade Subscription'}
      size="large"
    >
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </BizModal>
  );
}
