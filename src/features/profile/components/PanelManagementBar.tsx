/**
 * PanelManagementBar - Profile Panel Layout Management Controls
 *
 * Provides controls for toggling layout editing mode and resetting layout
 *
 * @tier ENTERPRISE
 * @phase Phase 6
 * @generated DNA v11.4.0
 */

'use client';

import { Settings, RotateCcw } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PanelManagementBarProps {
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
// PANELMANAGEMENTBAR COMPONENT
// ============================================================================

/**
 * PanelManagementBar - Controls for customizing profile panel layout
 *
 * Allows profile owners to toggle layout editing mode and reset layout to default
 *
 * @example
 * ```tsx
 * <PanelManagementBar
 *   isEditing={isEditing}
 *   onToggleEditing={() => setIsEditing(!isEditing)}
 *   onResetLayout={handleReset}
 *   isResetting={false}
 * />
 * ```
 */
export function PanelManagementBar({
  isEditing,
  onToggleEditing,
  onResetLayout,
  isResetting = false
}: PanelManagementBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Label and Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Settings className="w-4 h-4" />
            <span>Customize Layout</span>
          </div>

          <button
            onClick={onToggleEditing}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isEditing
                ? 'bg-[#022641] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {isEditing ? 'Done' : 'Edit Layout'}
          </button>
        </div>

        {/* Right: Reset Button */}
        <button
          onClick={onResetLayout}
          disabled={isResetting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset to Default</span>
        </button>
      </div>

      {/* Context Message */}
      {isEditing && (
        <p className="text-sm text-gray-600 italic mt-3">
          Drag panels to reorder. Click the eye icon to show/hide panels.
        </p>
      )}
    </div>
  );
}

export default PanelManagementBar;
