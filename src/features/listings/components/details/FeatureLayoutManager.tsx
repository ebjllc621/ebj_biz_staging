/**
 * FeatureLayoutManager - Nested DnD Context for Features
 *
 * Manages drag-and-drop reordering of features WITHIN a section
 *
 * @tier ENTERPRISE
 * @phase Phase 12.3 - Feature-Level Layout Control
 * @generated DNA v11.4.0
 */

'use client';

import { useCallback, useMemo, useRef } from 'react';
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
import { DraggableFeatureWrapper } from './DraggableFeatureWrapper';
import {
  getFeatureDndId,
  parseFeatureDndId,
  FEATURE_METADATA,
  DASHBOARD_ONLY_FEATURES
} from '@features/listings/types/listing-section-layout';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type {
  SectionId,
  FeatureId,
  FeatureConfig,
  ListingTier
} from '@features/listings/types/listing-section-layout';

export interface FeatureLayoutManagerProps {
  /** Section this feature manager belongs to */
  sectionId: SectionId;
  /** Features within this section */
  features: FeatureConfig[];
  /** Whether feature editing is active */
  isEditing: boolean;
  /** Callback when features are reordered or visibility changed */
  onFeaturesChange: (_features: FeatureConfig[]) => void;
  /** Render function for each feature */
  renderFeature?: (_featureId: FeatureId, _isVisible: boolean) => React.ReactNode;
  /** Current listing tier for enforcement (Phase 4) */
  listingTier: ListingTier;
  /** Callback when upgrade is clicked for a locked feature (Phase 4) */
  onUpgradeClick?: (_featureId: FeatureId) => void;
}

function FeatureLayoutManagerComponent({
  sectionId,
  features: _features,
  isEditing,
  onFeaturesChange,
  renderFeature,
  listingTier,
  onUpgradeClick
}: FeatureLayoutManagerProps) {
  // Use _features internally as features for clarity
  const features = _features;

  // Scroll position preservation - fixes scroll drift after drag operations
  const scrollPositionRef = useRef<{ x: number; y: number } | null>(null);

  // DnD sensors (smaller activation distance for features + TouchSensor - Phase 8)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
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

  // Sort features by order
  const sortedFeatures = useMemo(() =>
    [...features].sort((a, b) => a.order - b.order),
    [features]
  );

  // Feature DnD IDs (prefixed with section)
  const featureDndIds = useMemo(() =>
    sortedFeatures.map(f => getFeatureDndId(sectionId, f.id)),
    [sortedFeatures, sectionId]
  );

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

    if (!over || active.id === over.id) return;

    const activeId = parseFeatureDndId(active.id as string);
    const overId = parseFeatureDndId(over.id as string);

    if (!activeId || !overId) return;
    if (activeId.sectionId !== sectionId || overId.sectionId !== sectionId) return;

    const oldIndex = sortedFeatures.findIndex(f => f.id === activeId.featureId);
    const newIndex = sortedFeatures.findIndex(f => f.id === overId.featureId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedFeatures = arrayMove(sortedFeatures, oldIndex, newIndex).map((feature, idx) => ({
      ...feature,
      order: idx
    }));

    onFeaturesChange(reorderedFeatures);
  }, [sortedFeatures, sectionId, onFeaturesChange]);

  // Toggle feature visibility
  const toggleFeatureVisibility = useCallback((featureId: FeatureId) => {
    const newFeatures = features.map(feature =>
      feature.id === featureId ? { ...feature, visible: !feature.visible } : feature
    );
    onFeaturesChange(newFeatures);
  }, [features, onFeaturesChange]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={false}
    >
      <SortableContext
        items={featureDndIds}
        strategy={verticalListSortingStrategy}
        disabled={!isEditing}
      >
        <div className="space-y-3">
          {sortedFeatures.map(feature => {
            const metadata = FEATURE_METADATA[feature.id];
            const isLocked = !ListingTierEnforcer.isFeatureAvailable(feature.id, listingTier);
            const requiredTier = metadata?.minTier || 'essentials';
            const isVisible = feature.visible;
            const isDashboardOnly = DASHBOARD_ONLY_FEATURES.includes(feature.id);

            // ALWAYS skip dashboard-only features - they belong in listing manager, not details page
            // This includes: keywords, messages, followers, recommendations, notifications
            if (isDashboardOnly) return null;

            // In published view, skip locked features entirely
            if (!isEditing && isLocked) return null;

            // In published view, skip hidden features
            if (!isEditing && !isVisible) return null;

            return (
              <DraggableFeatureWrapper
                key={feature.id}
                sectionId={sectionId}
                featureId={feature.id}
                isEditing={isEditing}
                isVisible={isVisible}
                isLocked={isLocked}
                requiredTier={requiredTier}
                onToggleVisibility={() => toggleFeatureVisibility(feature.id)}
                onUpgradeClick={() => onUpgradeClick?.(feature.id)}
              >
                {renderFeature ? renderFeature(feature.id, isVisible) : null}
              </DraggableFeatureWrapper>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function FeatureLayoutManager(props: FeatureLayoutManagerProps) {
  return (
    <ErrorBoundary>
      <FeatureLayoutManagerComponent {...props} />
    </ErrorBoundary>
  );
}

export default FeatureLayoutManager;
