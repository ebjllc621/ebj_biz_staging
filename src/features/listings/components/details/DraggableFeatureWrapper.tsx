/**
 * DraggableFeatureWrapper - Wrapper for Draggable Listing Features
 *
 * Wraps individual features with drag-and-drop and visibility toggle functionality
 *
 * @tier ENTERPRISE
 * @phase Phase 12.3 - Feature-Level Layout Control
 * @generated DNA v11.4.0
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  FEATURE_ICONS,
  FEATURE_TITLES,
  getFeatureDndId
} from '@features/listings/types/listing-section-layout';
import type { SectionId, FeatureId, ListingTier } from '@features/listings/types/listing-section-layout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FeatureLockOverlay } from './FeatureLockOverlay';
import { FeatureUpgradeBadge } from './FeatureUpgradeBadge';

export interface DraggableFeatureWrapperProps {
  /** Section this feature belongs to */
  sectionId: SectionId;
  /** Feature identifier */
  featureId: FeatureId;
  /** Whether layout editing is active */
  isEditing: boolean;
  /** Whether feature is visible */
  isVisible: boolean;
  /** Toggle feature visibility */
  onToggleVisibility: () => void;
  /** Feature content */
  children: React.ReactNode;
  /** Whether feature is locked due to tier (Phase 4) */
  isLocked?: boolean;
  /** Required tier when locked (Phase 4) */
  requiredTier?: ListingTier;
  /** Callback when upgrade is clicked (Phase 4) */
  onUpgradeClick?: () => void;
}

function DraggableFeatureWrapperComponent({
  sectionId,
  featureId,
  isEditing,
  isVisible,
  onToggleVisibility,
  children,
  isLocked = false,
  requiredTier,
  onUpgradeClick
}: DraggableFeatureWrapperProps) {
  const dndId = getFeatureDndId(sectionId, featureId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: dndId,
    disabled: !isEditing || isLocked // Disable drag when locked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  const Icon = FEATURE_ICONS[featureId];
  const title = FEATURE_TITLES[featureId];

  // When not editing, render children directly (or nothing if hidden)
  if (!isEditing) {
    return isVisible ? <>{children}</> : null;
  }

  // When editing, wrap with drag handle and visibility toggle
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative
        ${isDragging ? 'ring-2 ring-[#ed6437]/50 shadow-md rounded-lg scale-[1.01]' : ''}
        ${!isVisible ? 'opacity-50' : ''}
        transition-all duration-150
      `}
    >
      {/* Feature Edit Header */}
      <div className="flex items-center justify-between bg-gray-50/80 rounded-lg border border-gray-100 border-l-[#022641]/30 border-l-2 px-3 py-1.5 mb-2">
        {/* Drag Handle + Title */}
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className={`
              p-2 sm:p-0.5 text-gray-400 hover:text-gray-600
              min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
              flex items-center justify-center
              ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'}
            `}
            aria-label="Drag to reorder feature"
            disabled={isLocked}
          >
            <GripVertical className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{title}</span>
            {!isVisible && <span className="text-gray-400">(hidden)</span>}
            {isLocked && requiredTier && (
              <FeatureUpgradeBadge requiredTier={requiredTier} size="small" />
            )}
          </div>
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={onToggleVisibility}
          disabled={isLocked}
          className={`
            p-2 sm:p-1.5 rounded-md transition-colors
            min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
            flex items-center justify-center
            ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
            ${isVisible
              ? 'text-[#022641] hover:bg-gray-100'
              : 'text-gray-400 hover:bg-gray-100'}
          `}
          aria-label={isVisible ? 'Hide feature' : 'Show feature'}
        >
          {isVisible ? <Eye className="w-5 h-5 sm:w-4 sm:h-4" /> : <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" />}
        </button>
      </div>

      {/* Feature Content or Placeholder */}
      <div className={`relative ${!isVisible ? 'pointer-events-none' : ''}`}>
        {isVisible ? (
          children
        ) : (
          // Placeholder for hidden feature
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center text-gray-400">
            <EyeOff className="w-5 h-5 mx-auto mb-1 opacity-50" />
            <p className="text-xs">Hidden from visitors</p>
          </div>
        )}
        {/* Lock overlay when feature is tier-locked */}
        {isLocked && requiredTier && (
          <FeatureLockOverlay
            requiredTier={requiredTier}
            featureLabel={title}
            onUpgradeClick={onUpgradeClick}
          />
        )}
      </div>
    </div>
  );
}

export function DraggableFeatureWrapper(props: DraggableFeatureWrapperProps) {
  return (
    <ErrorBoundary>
      <DraggableFeatureWrapperComponent {...props} />
    </ErrorBoundary>
  );
}

export default DraggableFeatureWrapper;
