/**
 * TouchAction - Reusable touch-friendly action component
 *
 * Provides consistent 44px minimum touch targets across the application.
 * Supports icon-only, icon+label, and full variants.
 * Used for mobile action buttons, quick actions, and touch interfaces.
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @mobile 44px minimum touch target enforced
 */

'use client';

import { memo, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TouchActionVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type TouchActionSize = 'sm' | 'md' | 'lg';

export interface TouchActionProps {
  /** Button label (for accessibility, shown when showLabel=true) */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler or href for links */
  action: string | (() => void);
  /** Visual variant */
  variant?: TouchActionVariant;
  /** Button size (all enforce 44px minimum) */
  size?: TouchActionSize;
  /** Show label text beside icon */
  showLabel?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Size configurations - ALL enforce 44px minimum
 */
const SIZE_CONFIG: Record<TouchActionSize, {
  button: string;
  icon: string;
  text: string;
}> = {
  sm: {
    button: 'min-h-[44px] min-w-[44px] px-3 py-2',
    icon: 'w-4 h-4',
    text: 'text-xs'
  },
  md: {
    button: 'min-h-[44px] min-w-[44px] px-4 py-2.5',
    icon: 'w-5 h-5',
    text: 'text-sm'
  },
  lg: {
    button: 'min-h-[44px] min-w-[44px] px-5 py-3',
    icon: 'w-6 h-6',
    text: 'text-base'
  }
};

/**
 * Variant color configurations
 */
const VARIANT_CONFIG: Record<TouchActionVariant, {
  base: string;
  hover: string;
  text: string;
}> = {
  primary: {
    base: 'bg-[#022641]',
    hover: 'hover:bg-[#033a5c]',
    text: 'text-white'
  },
  secondary: {
    base: 'bg-gray-100',
    hover: 'hover:bg-gray-200',
    text: 'text-gray-700'
  },
  success: {
    base: 'bg-green-600',
    hover: 'hover:bg-green-700',
    text: 'text-white'
  },
  danger: {
    base: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-white'
  },
  ghost: {
    base: 'bg-transparent',
    hover: 'hover:bg-gray-100',
    text: 'text-gray-700'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TouchAction = memo(forwardRef<HTMLButtonElement | HTMLAnchorElement, TouchActionProps>(
  function TouchAction(
    {
      label,
      icon: Icon,
      action,
      variant = 'primary',
      size = 'md',
      showLabel = false,
      disabled = false,
      className = '',
      isLoading = false
    },
    ref
  ) {
    const sizeClasses = SIZE_CONFIG[size];
    const variantClasses = VARIANT_CONFIG[variant];
    const isLink = typeof action === 'string';

    const baseClasses = `
      ${sizeClasses.button}
      ${variantClasses.base}
      ${variantClasses.hover}
      ${variantClasses.text}
      rounded-lg
      transition-colors
      flex items-center justify-center gap-2
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const content = (
      <>
        {isLoading ? (
          <span className={`${sizeClasses.icon} animate-spin`}>⟳</span>
        ) : (
          <Icon className={sizeClasses.icon} />
        )}
        {showLabel && <span className={sizeClasses.text}>{label}</span>}
      </>
    );

    // Render as link for href actions
    if (isLink) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={action}
          className={baseClasses}
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </a>
      );
    }

    // Render as button for callback actions
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={action}
        className={baseClasses}
        aria-label={label}
        disabled={disabled || isLoading}
      >
        {content}
      </button>
    );
  }
));

export default TouchAction;
