/**
 * DraggablePanelWrapper - Wrapper for Draggable Profile Panels
 *
 * Wraps profile panels with drag-and-drop and visibility toggle functionality
 *
 * @tier ENTERPRISE
 * @phase Phase 6
 * @generated DNA v11.4.0
 */

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Users, Store, FileText, BadgeCheck } from 'lucide-react';
import type { PanelId } from '../types/profile-layout';

// ============================================================================
// TYPE DEFINITIONS & CONSTANTS
// ============================================================================

const PANEL_ICONS: Record<PanelId, React.ComponentType<{ className?: string }>> = {
  'recommendations': BadgeCheck,
  'shared-connections': Users,
  'listings': Store,
  'content': FileText
};

const PANEL_TITLES: Record<PanelId, string> = {
  'recommendations': 'Recommendations Made',
  'shared-connections': 'Shared Connections',
  'listings': 'Associated Listings',
  'content': 'Content'
};

export interface DraggablePanelWrapperProps {
  /** Panel identifier */
  panelId: PanelId;
  /** Whether layout editing is active */
  isEditing: boolean;
  /** Whether panel is visible */
  isVisible: boolean;
  /** Toggle panel visibility */
  onToggleVisibility: () => void;
  /** Panel content */
  children: React.ReactNode;
}

// ============================================================================
// DRAGGABLEPANELWRAPPER COMPONENT
// ============================================================================

/**
 * DraggablePanelWrapper - Wrapper with drag handle and visibility toggle
 *
 * When editing is active, shows drag handle and visibility controls.
 * When not editing, renders children directly (or nothing if hidden).
 *
 * @example
 * ```tsx
 * <DraggablePanelWrapper
 *   panelId="listings"
 *   isEditing={true}
 *   isVisible={true}
 *   onToggleVisibility={() => toggleVisibility('listings')}
 * >
 *   <AssociatedListingsPanel username={username} />
 * </DraggablePanelWrapper>
 * ```
 */
export function DraggablePanelWrapper({
  panelId,
  isEditing,
  isVisible,
  onToggleVisibility,
  children
}: DraggablePanelWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: panelId, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 'auto'
  };

  const Icon = PANEL_ICONS[panelId];
  const title = PANEL_TITLES[panelId];

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
        relative mt-6
        ${isDragging ? 'ring-2 ring-[#ed6437] shadow-lg' : ''}
        ${!isVisible ? 'opacity-50' : ''}
        transition-all duration-200
      `}
    >
      {/* Edit Header */}
      <div className="flex items-center justify-between bg-gray-50 rounded-t-xl border border-b-0 border-gray-200 px-4 py-2">
        {/* Drag Handle + Title */}
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
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
            ${isVisible
              ? 'text-[#022641] hover:bg-gray-100'
              : 'text-gray-400 hover:bg-gray-100'}
          `}
          aria-label={isVisible ? 'Hide panel' : 'Show panel'}
        >
          {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Panel Content or Placeholder */}
      <div className={`${!isVisible ? 'pointer-events-none' : ''}`}>
        {isVisible ? (
          // Render actual panel with modified styles (remove mt-6 since we handle it)
          <div className="[&>*]:mt-0 [&>*]:rounded-t-none">
            {children}
          </div>
        ) : (
          // Placeholder for hidden panel
          <div className="bg-gray-100 rounded-b-xl border border-t-0 border-gray-200 p-8 text-center text-gray-500">
            <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">This panel is hidden from visitors</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DraggablePanelWrapper;
