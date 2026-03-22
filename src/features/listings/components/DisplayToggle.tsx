/**
 * DisplayToggle - Toggle between grid and list view modes
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 7 - Display Options & Responsive Design
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Provides a button group toggle for switching between grid and list view modes.
 * Follows canonical toggle pattern from MapToggle component.
 *
 * @see docs/pages/layouts/listings/phases/PHASE_7_BRAIN_PLAN.md
 * @see src/features/listings/components/MapToggle.tsx - Style reference
 */
'use client';

import { LayoutGrid, List } from 'lucide-react';

export type DisplayMode = 'grid' | 'list';

interface DisplayToggleProps {
  /** Current display mode */
  mode: DisplayMode;
  /** Callback when mode changes */
  onModeChange: (_mode: DisplayMode) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DisplayToggle component
 * Renders a button group for switching between grid and list view modes
 */
export function DisplayToggle({ mode, onModeChange, className = '' }: DisplayToggleProps) {
  return (
    <div
      className={`inline-flex rounded-lg border border-gray-300 overflow-hidden ${className}`}
      role="group"
      aria-label="Display mode"
    >
      <button
        onClick={() => onModeChange('grid')}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
          mode === 'grid'
            ? 'bg-biz-navy text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-pressed={mode === 'grid'}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onModeChange('list')}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
          mode === 'list'
            ? 'bg-biz-navy text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-pressed={mode === 'list'}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

export default DisplayToggle;
