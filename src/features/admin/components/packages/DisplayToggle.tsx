/**
 * DisplayToggle - Reusable display toggle button
 *
 * GOVERNANCE COMPLIANCE:
 * - Reusable component for package/addon display toggles
 * - Visual feedback for shown/hidden states
 * - Click handler with event propagation stop
 * - TIER: SIMPLE
 *
 * @authority docs/packages/phases/PHASE_5.0_BRAIN_PLAN.md - Section 5.4
 * @component
 */

'use client';

// ============================================================================
// TYPES
// ============================================================================

export interface DisplayToggleProps {
  isDisplayed: boolean;
  onClick: () => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DisplayToggle({ isDisplayed, onClick, disabled = false }: DisplayToggleProps) {
  const getDisplayStyles = () => {
    if (isDisplayed) {
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    } else {
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${getDisplayStyles()}`}
      aria-label={`Toggle display from ${isDisplayed ? 'shown' : 'hidden'}`}
    >
      {isDisplayed ? 'Shown' : 'Hidden'}
    </button>
  );
}
