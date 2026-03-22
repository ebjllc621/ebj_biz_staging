/**
 * SidebarLayoutManager - Sidebar-specific Layout Management
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 5 - Right Sidebar Management
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Drag-and-drop feature reordering (reuses FeatureLayoutManager)
 * - Feature visibility toggles
 * - Tier-based enforcement
 * - Layout persistence via API
 * - Loading state management
 *
 * Architecture:
 * - Extracts sidebar section from layout
 * - Delegates DnD to FeatureLayoutManager
 * - Updates sidebar section on layout changes
 * - Uses useListingSectionLayout for state management
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_5_BRAIN_PLAN.md
 */

'use client';

import { useMemo, useCallback } from 'react';
import { FeatureLayoutManager } from './FeatureLayoutManager';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';
import type {
  FeatureId,
  FeatureConfig,
  ListingTier
} from '@features/listings/types/listing-section-layout';

export interface SidebarLayoutManagerProps {
  /** Listing ID for layout loading */
  listingId: number;
  /** Current listing tier for enforcement */
  listingTier: ListingTier;
  /** Render function for each feature */
  renderFeature: (_featureId: FeatureId, _isVisible: boolean) => React.ReactNode;
  /** Callback when upgrade is clicked for locked feature */
  onUpgradeClick?: (_featureId: FeatureId) => void;
}

/**
 * SidebarLayoutManager Component
 *
 * Manages the sidebar section layout with drag-and-drop reordering,
 * visibility toggles, and tier-based enforcement. Delegates DnD logic
 * to FeatureLayoutManager and handles sidebar-specific layout updates.
 *
 * @param listingId - Listing ID for layout persistence
 * @param listingTier - Current subscription tier
 * @param renderFeature - Function to render feature content
 * @param onUpgradeClick - Callback for upgrade actions
 * @returns Sidebar layout manager with DnD features
 *
 * @example
 * ```tsx
 * <SidebarLayoutManager
 *   listingId={listing.id}
 *   listingTier={listing.tier}
 *   renderFeature={renderSidebarFeature}
 *   onUpgradeClick={handleUpgrade}
 * />
 * ```
 */
export function SidebarLayoutManager({
  listingId,
  listingTier,
  renderFeature,
  onUpgradeClick
}: SidebarLayoutManagerProps) {
  // Load listing layout
  const { layout, isLoading, updateLayout } = useListingSectionLayout({
    listingId,
    autoLoad: true
  });

  // Extract sidebar section
  const sidebarSection = useMemo(() => {
    if (!layout) return null;
    return layout.sections.find(s => s.id === 'sidebar') || null;
  }, [layout]);

  // Handle features change (update only sidebar section)
  const handleFeaturesChange = useCallback(async (features: FeatureConfig[]) => {
    if (!layout || !sidebarSection) return;

    const updatedSections = layout.sections.map(section =>
      section.id === 'sidebar'
        ? { ...section, features }
        : section
    );

    const updatedLayout = {
      ...layout,
      sections: updatedSections
    };

    await updateLayout(updatedLayout);
  }, [layout, sidebarSection, updateLayout]);

  // Loading state - return null to let parent handle skeleton
  if (isLoading || !sidebarSection) {
    return null;
  }

  return (
    <FeatureLayoutManager
      sectionId="sidebar"
      features={sidebarSection.features}
      isEditing={true}
      onFeaturesChange={handleFeaturesChange}
      renderFeature={renderFeature}
      listingTier={listingTier}
      onUpgradeClick={onUpgradeClick}
    />
  );
}

export default SidebarLayoutManager;
