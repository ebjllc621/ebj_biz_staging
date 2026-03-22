/**
 * DraggableSectionWrapper - Wrapper for Draggable Listing Sections
 *
 * Wraps listing sections with drag-and-drop and visibility toggle functionality.
 * Includes swipe-to-toggle visibility for mobile devices.
 *
 * @tier ENTERPRISE
 * @phase Phase 12.2 - Section Layout Manager
 * @phase Phase 8 - Mobile Optimization (swipe gestures)
 * @generated DNA v11.4.0
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { SECTION_ICONS, SECTION_TITLES } from '@features/listings/types/listing-section-layout';
import type { SectionId } from '@features/listings/types/listing-section-layout';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSwipeGesture } from '@features/connections/hooks/useSwipeGesture';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DraggableSectionWrapperProps {
  /** Section identifier */
  sectionId: SectionId;
  /** Whether layout editing is active */
  isEditing: boolean;
  /** Whether section is visible */
  isVisible: boolean;
  /** Toggle section visibility */
  onToggleVisibility: () => void;
  /** Section content */
  children: React.ReactNode;
}

// ============================================================================
// DRAGGABLESECTIONWRAPPER COMPONENT
// ============================================================================

/**
 * DraggableSectionWrapper - Wrapper with drag handle and visibility toggle
 *
 * When editing is active, shows drag handle and visibility controls.
 * When not editing, renders children directly (or nothing if hidden).
 *
 * @example
 * ```tsx
 * <DraggableSectionWrapper
 *   sectionId="features"
 *   isEditing={true}
 *   isVisible={true}
 *   onToggleVisibility={() => toggleVisibility('features')}
 * >
 *   <FeaturesSection />
 * </DraggableSectionWrapper>
 * ```
 */
function DraggableSectionWrapperComponent({
  sectionId,
  isEditing,
  isVisible,
  onToggleVisibility,
  children
}: DraggableSectionWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sectionId, disabled: !isEditing });

  // Swipe gesture for mobile visibility toggle (Phase 8 - Task 8.6)
  const { handlers: swipeHandlers } = useSwipeGesture({
    config: {
      threshold: 50,          // 50px threshold to prevent accidental swipes
      velocityThreshold: 0.3  // Lower velocity for easier triggering
    },
    onSwipeLeft: () => {
      // Only toggle when editing and not dragging - left swipe hides
      if (isEditing && !isDragging && isVisible) {
        onToggleVisibility();
      }
    },
    onSwipeRight: () => {
      // Only toggle when editing and not dragging - right swipe shows
      if (isEditing && !isDragging && !isVisible) {
        onToggleVisibility();
      }
    },
    enableHaptic: true
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 'auto'
  };

  const Icon = SECTION_ICONS[sectionId];
  const title = SECTION_TITLES[sectionId];

  // When not editing, render children directly (or nothing if hidden)
  if (!isEditing) {
    return isVisible ? <>{children}</> : null;
  }

  // When editing, wrap with drag handle, visibility toggle, and swipe gestures
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...swipeHandlers}
      className={`
        relative mt-6
        ${isDragging ? 'ring-2 ring-[#ed6437] shadow-lg scale-[1.02]' : ''}
        ${!isVisible ? 'opacity-50' : ''}
        transition-all duration-200
      `}
    >
      {/* Edit Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#022641]/10 via-[#022641]/8 to-[#022641]/5 rounded-t-xl border border-b-0 border-[#022641]/20 px-4 py-3 shadow-sm">
        {/* Drag Handle + Title */}
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="
              p-2 sm:p-1 cursor-grab active:cursor-grabbing
              text-gray-400 hover:text-gray-600
              min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
              flex items-center justify-center
              -ml-1
            "
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-6 h-6 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#022641]">
            <Icon className="w-4 h-4" />
            <span>{title}</span>
            {!isVisible && <span className="text-gray-400">(hidden)</span>}
          </div>
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={onToggleVisibility}
          className={`
            p-2 rounded-lg transition-colors
            min-w-[44px] min-h-[44px]
            flex items-center justify-center
            ${isVisible
              ? 'text-[#022641] hover:bg-gray-100'
              : 'text-gray-400 hover:bg-gray-100'}
          `}
          aria-label={isVisible ? 'Hide section' : 'Show section'}
        >
          {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Section Content or Placeholder */}
      <div className={`${!isVisible ? 'pointer-events-none' : ''}`}>
        {isVisible ? (
          // Render actual section with modified styles (remove mt-6 since we handle it)
          <div className="[&>*]:mt-0 [&>*]:rounded-t-none">
            {children}
          </div>
        ) : (
          // Placeholder for hidden section
          <div className="bg-gray-100 rounded-b-xl border border-t-0 border-gray-200 p-8 text-center text-gray-500">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">This section is hidden from visitors</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DraggableSectionWrapper(props: DraggableSectionWrapperProps) {
  return (
    <ErrorBoundary>
      <DraggableSectionWrapperComponent {...props} />
    </ErrorBoundary>
  );
}

export default DraggableSectionWrapper;
