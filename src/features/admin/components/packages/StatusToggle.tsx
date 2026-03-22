/**
 * StatusToggle - Reusable status toggle button
 *
 * GOVERNANCE COMPLIANCE:
 * - Reusable component for package/addon status toggles
 * - Visual feedback for active/inactive/archived states
 * - Click handler with event propagation stop
 * - TIER: SIMPLE
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md - Section 2.3
 * @component
 */

'use client';

import type { PackageStatus } from '@/types/admin-packages';

// ============================================================================
// TYPES
// ============================================================================

export interface StatusToggleProps {
  status: PackageStatus;
  onClick: () => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StatusToggle({ status, onClick, disabled = false }: StatusToggleProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
      case 'archived':
        return 'bg-red-100 text-red-800 cursor-not-allowed';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && status !== 'archived') {
          onClick();
        }
      }}
      disabled={disabled || status === 'archived'}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${getStatusStyles()}`}
      aria-label={`Toggle status from ${status}`}
    >
      {status}
    </button>
  );
}
