/**
 * MobileLayoutEditFAB - Floating Edit Button (Mobile Only)
 *
 * Floating action button for quick edit mode toggle on mobile
 *
 * @tier STANDARD
 * @phase Phase 8 - Mobile Optimization
 * @generated DNA v11.4.0
 */

'use client';

import { Pencil, Check } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MobileLayoutEditFABProps {
  /** Whether layout editing is active */
  isEditing: boolean;
  /** Toggle editing mode */
  onToggleEditing: () => void;
  /** Optionally position above MobileActionBar (default: true) */
  aboveActionBar?: boolean;
}

// ============================================================================
// MOBILELAYOUTEDITFAB COMPONENT
// ============================================================================

/**
 * MobileLayoutEditFAB - Floating edit button for mobile
 *
 * Only visible on mobile screens (< 1024px). Positioned above MobileActionBar
 * with z-index layering. Provides haptic feedback on tap.
 *
 * @example
 * ```tsx
 * <MobileLayoutEditFAB
 *   isEditing={isEditing}
 *   onToggleEditing={() => setIsEditing(!isEditing)}
 *   aboveActionBar={true}
 * />
 * ```
 */
export function MobileLayoutEditFAB({
  isEditing,
  onToggleEditing,
  aboveActionBar = true
}: MobileLayoutEditFABProps) {
  const handleClick = () => {
    // Haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onToggleEditing();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        lg:hidden fixed z-50 w-14 h-14
        rounded-full shadow-lg hover:shadow-xl
        active:scale-95 transition-all
        flex items-center justify-center
        ${aboveActionBar ? 'bottom-24 right-4' : 'bottom-4 right-4'}
        ${isEditing
          ? 'bg-[#022641] text-white'  // Navy when editing
          : 'bg-[#ed6437] text-white'  // Orange when not editing
        }
      `}
      aria-label={isEditing ? 'Done editing layout' : 'Edit layout'}
      type="button"
    >
      {isEditing ? (
        <Check className="w-6 h-6" />
      ) : (
        <Pencil className="w-6 h-6" />
      )}
    </button>
  );
}

export default MobileLayoutEditFAB;
