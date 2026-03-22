/**
 * BottomActionBar - Fixed bottom action bar for mobile
 *
 * Provides a fixed-position bottom bar for primary actions on mobile.
 * Uses safe area insets for devices with notches/home indicators.
 * Automatically hides on larger screens (md: breakpoint).
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @mobile Thumb-zone optimized action placement
 */

'use client';

import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BottomAction {
  /** Action label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Disabled state */
  disabled?: boolean;
  /** Badge count (optional) */
  badge?: number;
}

export interface BottomActionBarProps {
  /** Array of actions (max 4 recommended) */
  actions: BottomAction[];
  /** Show on desktop too (default: mobile only) */
  showOnDesktop?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VARIANT_STYLES: Record<string, string> = {
  primary: 'text-[#ed6437]',
  secondary: 'text-gray-600',
  danger: 'text-red-600'
};

// ============================================================================
// COMPONENT
// ============================================================================

function BottomActionBarComponent({
  actions,
  showOnDesktop = false,
  className = ''
}: BottomActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white border-t border-gray-200 shadow-lg
        pb-safe
        ${showOnDesktop ? '' : 'md:hidden'}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="navigation"
      aria-label="Quick actions"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const variantClass = VARIANT_STYLES[action.variant || 'secondary'];

          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                py-3 px-2
                min-h-[56px]
                transition-colors
                active:bg-gray-100
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClass}
              `.trim().replace(/\s+/g, ' ')}
              aria-label={action.label}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomActionBar = memo(BottomActionBarComponent);
export default BottomActionBar;
