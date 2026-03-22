/**
 * SectionManagementBar - Listing Section Layout Management Controls
 *
 * Provides controls for toggling layout editing mode and resetting layout
 *
 * @tier STANDARD
 * @phase Phase 12.2 - Section Layout Manager
 * @generated DNA v11.4.0
 */

'use client';

import { Settings, RotateCcw } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SectionManagementBarProps {
  /** Whether layout editing is active */
  isEditing: boolean;
  /** Toggle editing mode */
  onToggleEditing: () => void;
  /** Reset layout to default */
  onResetLayout: () => void;
  /** Whether reset is in progress */
  isResetting?: boolean;
}

// ============================================================================
// SECTIONMANAGEMENTBAR COMPONENT
// ============================================================================

/**
 * SectionManagementBar - Controls for customizing listing section layout
 *
 * Allows listing owners to toggle layout editing mode and reset layout to default
 *
 * @example
 * ```tsx
 * <SectionManagementBar
 *   isEditing={isEditing}
 *   onToggleEditing={() => setIsEditing(!isEditing)}
 *   onResetLayout={handleReset}
 *   isResetting={false}
 * />
 * ```
 */
export function SectionManagementBar({
  isEditing,
  onToggleEditing,
  onResetLayout,
  isResetting = false
}: SectionManagementBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Label + Toggle - Stack on mobile, inline on desktop */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Settings className="w-4 h-4" />
            <span>Customize Layout</span>
          </div>

          <button
            onClick={onToggleEditing}
            className={`
              w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg text-sm font-medium
              transition-all active:scale-95 min-h-[44px]
              ${isEditing
                ? 'bg-[#022641] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {isEditing ? 'Done Editing' : 'Edit Layout'}
          </button>
        </div>

        {/* Reset Button - Full width on mobile */}
        <button
          onClick={onResetLayout}
          disabled={isResetting}
          className="
            flex items-center justify-center gap-2 w-full sm:w-auto
            px-4 py-3 sm:py-2 min-h-[44px]
            text-sm text-gray-600 hover:text-gray-900
            hover:bg-gray-100 rounded-lg transition-colors
            disabled:opacity-50
          "
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset to Default</span>
        </button>
      </div>

      {/* Context Message - Updated for mobile */}
      {isEditing && (
        <p className="text-sm text-gray-600 italic mt-4">
          <span className="hidden sm:inline">Drag sections to reorder. Click the eye icon to show/hide sections.</span>
          <span className="sm:hidden">Hold and drag to reorder. Tap eye icon to show/hide.</span>
        </p>
      )}
    </div>
  );
}

export default SectionManagementBar;
