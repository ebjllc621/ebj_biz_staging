/**
 * RemoveAddonModal - Remove add-on suite confirmation modal
 *
 * Confirms add-on removal with deferred effective date.
 * Removal takes effect at end of billing period.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Add-On Management
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState } from 'react';
import type { AddonSuite } from '@core/types/subscription';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';

export interface RemoveAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  addon: AddonSuite;
  listingId: number;
  subscriptionId: number;
  onSuccess: () => void;
}

/**
 * RemoveAddonModal - Handles add-on suite removal workflow
 *
 * @component
 * @param {RemoveAddonModalProps} props - Component props
 * @returns {JSX.Element} Rendered remove modal
 */
export function RemoveAddonModal({
  isOpen,
  onClose,
  addon,
  listingId,
  subscriptionId,
  onSuccess
}: RemoveAddonModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/subscription/addons/remove', {
        method: 'POST',
        body: JSON.stringify({
          listingId,
          subscriptionId,
          addonSuiteId: addon.id
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove add-on');
      }

      onClose();
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to remove add-on');
      setLoading(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Remove ${addon.display_name}`}
      size="medium"
    >
      <div className="p-6">
        {/* Deferred Removal Warning */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-900">Deferred Removal</p>
              <p className="text-sm text-yellow-800 mt-1">
                Removal will take effect at the end of your current billing period.
                You will continue to have access to all features until then.
              </p>
            </div>
          </div>
        </div>

        {/* Features Being Lost */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            The following features will no longer be available:
          </p>
          <ul className="space-y-2">
            {addon.features.map((feature, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-600">
                <span className="text-red-600 mr-2">✗</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirmation Question */}
        <p className="text-center text-gray-700 mb-6">
          Are you sure you want to remove <strong>{addon.display_name}</strong>?
        </p>

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
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Removal'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}
