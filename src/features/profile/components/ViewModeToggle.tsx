// src/features/profile/components/ViewModeToggle.tsx

'use client';

import { Eye, Pencil } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProfileViewMode = 'edit' | 'published';

export interface ViewModeToggleProps {
  /** Current view mode */
  viewMode: ProfileViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: ProfileViewMode) => void;
  /** Whether this is the profile owner */
  isOwner: boolean;
  /** Whether user is an admin viewing another's profile */
  isAdmin?: boolean;
}

// ============================================================================
// VIEWMODETOGGLE COMPONENT
// ============================================================================

/**
 * ViewModeToggle - Toggle between Edit and Published view modes
 *
 * Allows profile owners and admins to preview how their profile
 * appears to public visitors.
 *
 * @example
 * ```tsx
 * <ViewModeToggle
 *   viewMode={viewMode}
 *   onViewModeChange={setViewMode}
 *   isOwner={true}
 * />
 * ```
 */
export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  isOwner,
  isAdmin = false
}: ViewModeToggleProps) {
  const isEditView = viewMode === 'edit';
  const isPublishedView = viewMode === 'published';

  // Context message based on current mode and user type
  const getContextMessage = (): string => {
    if (isPublishedView) {
      if (isAdmin && !isOwner) {
        return "Viewing as a public visitor would see this profile.";
      }
      return "This is how your profile appears to public visitors.";
    }
    if (isAdmin && !isOwner) {
      return "You are viewing with admin editing capabilities.";
    }
    return "You can edit your profile in this view.";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Label and Toggle Group */}
        <div className="flex items-center gap-4">
          {/* Label */}
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Eye className="w-4 h-4" />
            <span>Viewing profile as:</span>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
            {/* Edit View Button */}
            <button
              onClick={() => onViewModeChange('edit')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${isEditView
                  ? 'bg-[#022641] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
              aria-pressed={isEditView}
            >
              <Pencil className="w-4 h-4" />
              <span>Edit View</span>
            </button>

            {/* Published View Button */}
            <button
              onClick={() => onViewModeChange('published')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${isPublishedView
                  ? 'bg-[#022641] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
              aria-pressed={isPublishedView}
            >
              <Eye className="w-4 h-4" />
              <span>Published View</span>
            </button>
          </div>
        </div>

        {/* Context Message */}
        <p className="text-sm text-gray-600 italic">
          {getContextMessage()}
        </p>
      </div>
    </div>
  );
}

export default ViewModeToggle;
