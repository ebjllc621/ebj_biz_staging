/**
 * AddonGrid - Grid layout for add-on suite cards with modal management
 *
 * Orchestrates AddonCard display and handles add/remove modal workflows.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Add-On Management
 * @governance Build Map v2.1 ENHANCED compliance
 */

'use client';

import { useState } from 'react';
import type { AddonSuite } from '@core/types/subscription';
import { AddonCard } from './AddonCard';
import { AddAddonModal } from './AddAddonModal';
import { RemoveAddonModal } from './RemoveAddonModal';

export interface AddonGridProps {
  availableAddons: AddonSuite[];
  activeAddons: AddonSuite[];
  isPremium: boolean;
  listingId: number;
  subscriptionId: number | null;
}

/**
 * AddonGrid - Displays grid of add-on suite cards with modal integration
 *
 * @component
 * @param {AddonGridProps} props - Component props
 * @returns {JSX.Element} Rendered add-on grid
 */
export function AddonGrid({
  availableAddons,
  activeAddons,
  isPremium,
  listingId,
  subscriptionId
}: AddonGridProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<AddonSuite | null>(null);

  const handleAddClick = (addon: AddonSuite) => {
    setSelectedAddon(addon);
    setAddModalOpen(true);
  };

  const handleRemoveClick = (addon: AddonSuite) => {
    setSelectedAddon(addon);
    setRemoveModalOpen(true);
  };

  const handleModalClose = () => {
    setAddModalOpen(false);
    setRemoveModalOpen(false);
    setSelectedAddon(null);
  };

  const handleSuccess = () => {
    // Reload page to reflect changes
    window.location.reload();
  };

  const isAddonActive = (addonId: number): boolean => {
    return activeAddons.some((a) => a.id === addonId);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {availableAddons.map((addon) => (
          <AddonCard
            key={addon.id}
            addon={addon}
            isActive={isAddonActive(addon.id)}
            isPremium={isPremium}
            onAdd={() => handleAddClick(addon)}
            onRemove={() => handleRemoveClick(addon)}
          />
        ))}
      </div>

      {/* Modals */}
      {selectedAddon && subscriptionId && (
        <>
          <AddAddonModal
            isOpen={addModalOpen}
            onClose={handleModalClose}
            addon={selectedAddon}
            listingId={listingId}
            subscriptionId={subscriptionId}
            isPremium={isPremium}
            onSuccess={handleSuccess}
          />

          <RemoveAddonModal
            isOpen={removeModalOpen}
            onClose={handleModalClose}
            addon={selectedAddon}
            listingId={listingId}
            subscriptionId={subscriptionId}
            onSuccess={handleSuccess}
          />
        </>
      )}

      {!subscriptionId && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-800">
            No active subscription found. Please subscribe to a plan before adding add-ons.
          </p>
        </div>
      )}
    </>
  );
}
