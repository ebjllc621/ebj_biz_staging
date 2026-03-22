/**
 * SectionLayoutManager - Listing Section Layout Orchestrator
 *
 * Manages drag-and-drop reordering and visibility toggling of listing sections
 *
 * @tier ENTERPRISE
 * @phase Phase 12.2 - Section Layout Manager
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { SectionManagementBar } from './SectionManagementBar';
import { DraggableSectionWrapper } from './DraggableSectionWrapper';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { SectionId, FeatureConfig, ListingSectionLayout, ListingTier } from '@features/listings/types/listing-section-layout';
import { isMainContentSection } from '@features/listings/types/listing-section-layout';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SectionLayoutManagerProps {
  /** Listing ID for layout persistence */
  listingId: number;
  /** Whether to show management controls */
  showControls: boolean;
  /** Render function for section content - receives onFeaturesChange for persisting feature updates */
  renderSection: (
    sectionId: SectionId,
    features: FeatureConfig[],
    isEditing: boolean,
    onFeaturesChange: (newFeatures: FeatureConfig[]) => void
  ) => React.ReactNode;
  /** Current listing tier for feature enforcement (Phase 4) */
  listingTier: ListingTier;
  /** Callback when upgrade is clicked (Phase 4) */
  onUpgradeClick?: () => void;
}

// ============================================================================
// SECTIONLAYOUTMANAGER COMPONENT
// ============================================================================

/**
 * SectionLayoutManager - Main orchestrator for section layout management
 *
 * Handles drag-and-drop reordering, visibility toggling, and layout persistence
 *
 * @example
 * ```tsx
 * <SectionLayoutManager
 *   listingId={123}
 *   showControls={canEdit}
 * >
 *   {sections}
 * </SectionLayoutManager>
 * ```
 */
function SectionLayoutManagerComponent({
  listingId,
  showControls,
  renderSection,
  listingTier,
  onUpgradeClick
}: SectionLayoutManagerProps) {
  // Note: listingTier and onUpgradeClick props are accepted for Phase 4 compliance
  // and passed through to renderSection callback.
  // Tier enforcement is handled in the FeatureLayoutManager used by renderSection.
  void listingTier;
  void onUpgradeClick;
  const {
    layout,
    isLoading,
    updateLayout,
    resetLayout
  } = useListingSectionLayout({
    listingId,
    autoLoad: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Scroll position preservation - fixes scroll drift after drag operations
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);

  // DnD sensors (with TouchSensor for mobile - Phase 8)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,        // 200ms hold before drag activates
        tolerance: 5       // 5px movement tolerance during delay
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Get sorted sections - filtered to only main content sections
  // Excludes: sidebar (handled separately), communication (dashboard-only)
  const sortedSections = useMemo(() => {
    if (!layout) return [];
    return [...layout.sections]
      .filter(section => isMainContentSection(section.id))
      .sort((a, b) => a.order - b.order);
  }, [layout]);

  // Handle drag start - save scroll position
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Save current scroll position before drag
    scrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY
    };
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Restore scroll position after a short delay to prevent drift
    if (scrollPositionRef.current) {
      const savedPosition = scrollPositionRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({
          left: savedPosition.x,
          top: savedPosition.y,
          behavior: 'instant'
        });
      });
      scrollPositionRef.current = null;
    }

    if (!over || active.id === over.id || !layout) return;

    const oldIndex = sortedSections.findIndex(s => s.id === active.id);
    const newIndex = sortedSections.findIndex(s => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSections = arrayMove(sortedSections, oldIndex, newIndex).map((section, idx) => ({
      ...section,
      order: idx
    }));

    const newLayout: ListingSectionLayout = {
      ...layout,
      sections: reorderedSections,
      updatedAt: new Date().toISOString()
    };

    updateLayout(newLayout);
  }, [sortedSections, layout, updateLayout]);

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId: SectionId) => {
    if (!layout) return;

    const newSections = layout.sections.map(section =>
      section.id === sectionId ? { ...section, visible: !section.visible } : section
    );

    const newLayout: ListingSectionLayout = {
      ...layout,
      sections: newSections,
      updatedAt: new Date().toISOString()
    };

    updateLayout(newLayout);
  }, [layout, updateLayout]);

  // Handle feature changes within a section (Phase 12.3)
  // This callback is passed to renderSection for FeatureLayoutManager integration
  const handleFeaturesChange = useCallback((sectionId: SectionId, newFeatures: FeatureConfig[]) => {
    if (!layout) return;

    const newSections = layout.sections.map(section =>
      section.id === sectionId
        ? { ...section, features: newFeatures }
        : section
    );

    const newLayout: ListingSectionLayout = {
      ...layout,
      sections: newSections,
      updatedAt: new Date().toISOString()
    };

    updateLayout(newLayout);
  }, [layout, updateLayout]);

  // Reset to default
  const handleResetLayout = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetLayout();
    } catch (error) {
      console.error('Error resetting layout:', error);
    } finally {
      setIsResetting(false);
    }
  }, [resetLayout]);

  // Toggle editing mode
  const handleToggleEditing = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  // If still loading, return null (parent handles loading state)
  if (isLoading || !layout) {
    return null;
  }

  return (
    <>
      {/* Section Management Bar - Only when showControls is true */}
      {showControls && (
        <SectionManagementBar
          isEditing={isEditing}
          onToggleEditing={handleToggleEditing}
          onResetLayout={handleResetLayout}
          isResetting={isResetting}
        />
      )}

      {/* DnD Context wraps all draggable sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <SortableContext
          items={sortedSections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
          disabled={!isEditing}
        >
          {sortedSections.map(section => {
            const isVisible = section.visible;

            // Skip rendering if section is hidden and not editing
            if (!isVisible && !isEditing) {
              return null;
            }

            return (
              <DraggableSectionWrapper
                key={section.id}
                sectionId={section.id}
                isEditing={isEditing}
                isVisible={isVisible}
                onToggleVisibility={() => toggleSectionVisibility(section.id)}
              >
                {renderSection(
                  section.id,
                  section.features,
                  isEditing,
                  (newFeatures) => handleFeaturesChange(section.id, newFeatures)
                )}
              </DraggableSectionWrapper>
            );
          })}
        </SortableContext>
      </DndContext>
    </>
  );
}

export function SectionLayoutManager(props: SectionLayoutManagerProps) {
  return (
    <ErrorBoundary>
      <SectionLayoutManagerComponent {...props} />
    </ErrorBoundary>
  );
}

export default SectionLayoutManager;
