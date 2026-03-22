/**
 * BizButton Component - Bizconekt Branded Button
 *
 * @authority master_build_v_4_4_0.md
 * @pattern React 18 component with Bizconekt branding
 * @governance All primary actions should use BizButton
 *
 * FEATURES:
 * - Primary (orange), Secondary (navy), Neutral (gray) variants
 * - Full width option
 * - Loading state with spinner
 * - Disabled state styling
 * - Icon support (left/right)
 * - Consistent Bizconekt branding
 */

'use client';

import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type BizButtonVariant = 'primary' | 'secondary' | 'neutral' | 'outline' | 'ghost' | 'danger';
export type BizButtonSize = 'sm' | 'md' | 'lg';

export interface BizButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: BizButtonVariant;
  /** Button size */
  size?: BizButtonSize;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Icon to show on the left */
  leftIcon?: ReactNode;
  /** Icon to show on the right */
  rightIcon?: ReactNode;
  /** Additional className */
  className?: string;
  /** Button content */
  children: ReactNode;
}

// ============================================================================
// STYLE MAPPINGS
// ============================================================================

const variantStyles: Record<BizButtonVariant, string> = {
  primary: `
    bg-bizconekt-primary text-white
    hover:bg-bizconekt-primaryDark
    border border-bizconekt-primary
    focus:ring-bizconekt-primary
  `,
  secondary: `
    bg-bizconekt-navy text-white
    hover:bg-bizconekt-navyLight hover:text-bizconekt-navy
    border border-bizconekt-navy
    focus:ring-bizconekt-navy
  `,
  neutral: `
    bg-gray-100 text-gray-700
    hover:bg-gray-200
    border border-gray-300
    focus:ring-gray-400
  `,
  outline: `
    bg-transparent text-bizconekt-primary
    hover:bg-bizconekt-primaryLight
    border border-bizconekt-primary
    focus:ring-bizconekt-primary
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100
    border border-transparent
    focus:ring-gray-400
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    border border-red-600
    focus:ring-red-500
  `,
};

const sizeStyles: Record<BizButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
};

// ============================================================================
// LOADING SPINNER
// ============================================================================

function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// BIZBUTTON COMPONENT
// ============================================================================

/**
 * BizButton - Bizconekt branded button component
 *
 * @example
 * ```tsx
 * // Primary button
 * <BizButton variant="primary" onClick={handleClick}>
 *   Sign In
 * </BizButton>
 *
 * // Secondary with loading
 * <BizButton variant="secondary" loading>
 *   Submitting...
 * </BizButton>
 *
 * // With icons
 * <BizButton leftIcon={<PlusIcon />}>
 *   Add Item
 * </BizButton>
 * ```
 */
const BizButton = forwardRef<HTMLButtonElement, BizButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-semibold shadow-sm
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Loading Spinner */}
        {loading && (
          <LoadingSpinner className="-ml-1 mr-2" />
        )}

        {/* Left Icon */}
        {!loading && leftIcon && (
          <span className="mr-2 -ml-1">{leftIcon}</span>
        )}

        {/* Button Text */}
        {children}

        {/* Right Icon */}
        {rightIcon && (
          <span className="ml-2 -mr-1">{rightIcon}</span>
        )}
      </button>
    );
  }
);

BizButton.displayName = 'BizButton';

export default BizButton;

// ============================================================================
// STYLE EXPORTS (for custom implementations)
// ============================================================================

export const bizButtonStyles = variantStyles;
export const bizButtonSizes = sizeStyles;
