/**
 * ManageAddonsModal - Add-on Management Modal
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use BizModal wrapper
 * - Grid display of available add-ons
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import type { AddonSuite, ListingSubscriptionAddon } from '@features/dashboard/types';
import { AddonCard } from './AddonCard';

export interface ManageAddonsModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Available add-ons */
  availableAddons: AddonSuite[];
  /** Active add-ons */
  activeAddons: ListingSubscriptionAddon[];
  /** Add add-on callback */
  onAddAddon: (addon: AddonSuite) => Promise<void>;
  /** Remove add-on callback */
  onRemoveAddon: (addon: AddonSuite) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

export function ManageAddonsModal({
  isOpen,
  onClose,
  availableAddons,
  activeAddons,
  onAddAddon,
  onRemoveAddon,
  isLoading = false
}: ManageAddonsModalProps) {
  const isAddonActive = (addonId: number): boolean => {
    return activeAddons.some((a) => a.addon_suite_id === addonId);
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Add-ons"
      subtitle="Enhance your subscription with additional features"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Add-ons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableAddons.map((addon) => (
            <AddonCard
              key={addon.id}
              addon={addon}
              isActive={isAddonActive(addon.id)}
              onAdd={onAddAddon}
              onRemove={onRemoveAddon}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Empty State */}
        {availableAddons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No add-ons available at this time.</p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default ManageAddonsModal;
