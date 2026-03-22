/**
 * BizModal Component - Reusable Modal Dialog with Bizconekt Branding
 *
 * @authority master_build_v_4_4_0.md section 9.2 (BizModal required)
 * @pattern React 18 portal pattern with accessibility
 * @governance 100% BizModal compliance mandatory for all modals
 * @compliance WCAG 2.1 AA accessibility standards
 *
 * FEATURES:
 * - Bizconekt gradient header (navy to orange)
 * - Accessible modal with focus trap
 * - ESC key dismissal
 * - Click outside to close
 * - Responsive sizing (sm, md, lg, xl, 2xl)
 * - Dark overlay backdrop
 * - Smooth animations
 * - Portal rendering to body
 * - Optional subtitle support
 */

'use client';

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useDraggable } from '@core/hooks/useDraggable';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BizModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Maximum width preset (preferred) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  /**
   * Legacy size prop for backward compatibility
   * Maps: small->md, medium->2xl, large->4xl, full->7xl
   * @deprecated Use maxWidth instead
   */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Whether to show close button in header */
  showCloseButton?: boolean;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Whether ESC key closes modal */
  closeOnEscape?: boolean;
  /** Optional footer content */
  footer?: ReactNode;
  /** Optional custom className for modal container */
  className?: string;
  /** Full-screen modal on mobile (<640px) */
  fullScreenMobile?: boolean;
  /** Enable grab-and-drag repositioning (default: true) */
  draggable?: boolean;
}

// ============================================================================
// SIZE MAPPING
// ============================================================================

/**
 * Static class mappings for modal widths
 * IMPORTANT: All classes must be written statically for Tailwind JIT to compile them.
 * Dynamic string concatenation (e.g., `sm:${class}`) will NOT work.
 */
const SIZE_CLASSES_STATIC: Record<NonNullable<BizModalProps['size']>, { normal: string; fullScreenMobile: string }> = {
  small: {
    normal: 'max-w-md',
    fullScreenMobile: 'w-full h-full sm:max-w-md sm:h-auto',
  },
  medium: {
    normal: 'max-w-2xl',
    fullScreenMobile: 'w-full h-full sm:max-w-2xl sm:h-auto',
  },
  large: {
    normal: 'max-w-4xl',
    fullScreenMobile: 'w-full h-full sm:max-w-4xl sm:h-auto',
  },
  full: {
    normal: 'max-w-7xl',
    fullScreenMobile: 'w-full h-full sm:max-w-7xl sm:h-auto',
  },
};

/**
 * Maps maxWidth values to static size classes
 * Used when maxWidth prop is passed directly (not via legacy size prop)
 */
const MAX_WIDTH_CLASSES_STATIC: Record<NonNullable<BizModalProps['maxWidth']>, { normal: string; fullScreenMobile: string }> = {
  sm: {
    normal: 'max-w-sm',
    fullScreenMobile: 'w-full h-full sm:max-w-sm sm:h-auto',
  },
  md: {
    normal: 'max-w-md',
    fullScreenMobile: 'w-full h-full sm:max-w-md sm:h-auto',
  },
  lg: {
    normal: 'max-w-lg',
    fullScreenMobile: 'w-full h-full sm:max-w-lg sm:h-auto',
  },
  xl: {
    normal: 'max-w-xl',
    fullScreenMobile: 'w-full h-full sm:max-w-xl sm:h-auto',
  },
  '2xl': {
    normal: 'max-w-2xl',
    fullScreenMobile: 'w-full h-full sm:max-w-2xl sm:h-auto',
  },
  '4xl': {
    normal: 'max-w-4xl',
    fullScreenMobile: 'w-full h-full sm:max-w-4xl sm:h-auto',
  },
  '7xl': {
    normal: 'max-w-7xl',
    fullScreenMobile: 'w-full h-full sm:max-w-7xl sm:h-auto',
  },
};


// ============================================================================
// BIZMODAL COMPONENT
// ============================================================================

/**
 * BizModal - Enterprise modal component with Bizconekt branding and accessibility
 *
 * @example
 * ```tsx
 * <BizModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Sign In"
 *   subtitle="Welcome back to Bizconekt"
 *   maxWidth="md"
 * >
 *   <form>...</form>
 * </BizModal>
 * ```
 */
export default function BizModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  fullScreenMobile = false,
  draggable = true,
}: BizModalProps) {
  // Resolve size classes from static mappings (Tailwind JIT compatible)
  // Priority: size prop (legacy) -> maxWidth prop -> default 'md'
  const sizeClasses = size
    ? SIZE_CLASSES_STATIC[size]
    : MAX_WIDTH_CLASSES_STATIC[maxWidth ?? 'md'];

  const modalSizeClass = fullScreenMobile ? sizeClasses.fullScreenMobile : sizeClasses.normal;

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const hasInitialFocused = useRef(false);

  // Draggable positioning - enabled by default, disabled on mobile fullscreen
  const enableDrag = draggable && !fullScreenMobile;
  const { position, isDragging, handlers: dragHandlers, resetPosition } = useDraggable({
    enabled: enableDrag,
    constrainToViewport: true,
  });

  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================

  useEffect(() => {
    if (!isOpen) {
      // Reset focus tracking and position when modal closes
      hasInitialFocused.current = false;
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
      resetPosition();
      return;
    }

    // Store previous active element only on initial open
    if (!hasInitialFocused.current) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    // Focus modal container ONLY on initial open, not on every re-render
    // This prevents stealing focus from inputs/textareas inside the modal
    if (!hasInitialFocused.current) {
      setTimeout(() => {
        modalRef.current?.focus();
        hasInitialFocused.current = true;
      }, 0);
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, resetPosition]);

  // ============================================================================
  // KEYBOARD HANDLING
  // ============================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // ============================================================================
  // BACKDROP CLICK
  // ============================================================================

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative z-10 ${modalSizeClass}
          bg-white ${fullScreenMobile ? 'sm:rounded-xl' : 'rounded-xl'} shadow-xl
          max-h-[90vh] flex flex-col
          animate-fadeIn overflow-hidden
          ${isDragging ? 'shadow-2xl' : ''}
          ${className}
        `}
        style={enableDrag ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        } : undefined}
      >
        {/* Gradient Header - Bizconekt Branding (Drag Handle) */}
        <div
          className={`
            flex-shrink-0 w-full py-4 sm:py-6 px-4 sm:px-6 rounded-t-xl relative
            bg-gradient-to-br from-bizconekt-navy to-bizconekt-primary
            ${enableDrag ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}
            select-none
          `}
          {...(enableDrag ? dragHandlers : {})}
        >
          {/* Top-right controls: Logo + Close Button */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center z-20">
            {/* Logo Icon - positioned left of close button */}
            <Image
              src="/uploads/site/branding/logo-icon.png"
              alt=""
              width={63}
              height={63}
              className="flex-shrink-0"
              style={{ marginRight: '15px' }}
              aria-hidden="true"
            />
            {/* Close Button */}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="
                  text-white text-2xl font-bold
                  opacity-70 hover:opacity-100
                  focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-bizconekt-primary
                  rounded-full w-8 h-8 flex items-center justify-center
                  transition-opacity
                "
                aria-label="Close modal"
              >
                &times;
              </button>
            )}
          </div>

          {/* Title Area - centered between left margin and logo */}
          <div
            className="text-center"
            style={{ paddingRight: showCloseButton ? '120px' : '80px' }}
          >
            <h2
              id="modal-title"
              className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 break-words leading-tight"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-white text-xs sm:text-sm opacity-90 break-words leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Section Header with step badge and divider
 */
export interface BizModalSectionHeaderProps {
  step: number;
  title: string;
  onClick?: () => void;
  isExpanded?: boolean;
  hasError?: boolean;
}

export function BizModalSectionHeader({
  step,
  title,
  onClick,
  isExpanded = true,
  hasError = false,
}: BizModalSectionHeaderProps) {
  return (
    <div
      className={`
        flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 mt-4 sm:mt-6 first:mt-0
        ${onClick ? 'cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors' : ''}
        ${hasError ? 'bg-amber-50 border border-amber-200 rounded-lg p-2 -m-2' : ''}
      `}
      onClick={onClick}
    >
      <span
        className={`
          w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center
          rounded-full font-bold text-sm sm:text-lg flex-shrink-0
          ${hasError ? 'bg-amber-500 text-white' : 'bg-bizconekt-primary text-white'}
        `}
      >
        {step}
      </span>
      <span
        className={`
          font-bold text-lg sm:text-xl break-words
          ${hasError ? 'text-amber-800' : 'text-bizconekt-navy'}
        `}
      >
        {title}
      </span>
      <div
        className={`
          flex-1 border-b-2 ml-2 sm:ml-3 min-w-0
          ${hasError ? 'border-amber-300' : 'border-bizconekt-primaryLight'}
        `}
      />
      {onClick && (
        <div className="flex-shrink-0 ml-2">
          <svg
            className={`
              w-5 h-5 transition-transform
              ${isExpanded ? 'rotate-180' : ''}
              ${hasError ? 'text-amber-600' : 'text-gray-400'}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Styled input for BizModal forms
 */
export interface BizModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function BizModalInput({ label, error, className = '', ...props }: BizModalInputProps) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-2 text-sm text-bizconekt-navy break-words">
        {label}
      </label>
      <input
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2 sm:py-3 text-sm sm:text-base
          focus:outline-none focus:ring-2 transition shadow-sm
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-bizconekt-primary focus:ring-bizconekt-primaryLight'
          }
          ${className}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Styled textarea for BizModal forms
 */
export interface BizModalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function BizModalTextarea({ label, error, className = '', ...props }: BizModalTextareaProps) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-2 text-sm text-bizconekt-navy break-words">
        {label}
      </label>
      <textarea
        {...props}
        className={`
          w-full rounded-lg border px-3 py-2 sm:py-3 text-sm sm:text-base
          focus:outline-none focus:ring-2 transition shadow-sm resize-none
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-bizconekt-primary focus:ring-bizconekt-primaryLight'
          }
          ${className}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Responsive form grid - stacks on mobile
 */
export function BizModalFormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      {children}
    </div>
  );
}

// ============================================================================
// BIZMODAL BUTTON COMPONENT
// ============================================================================

export interface BizModalButtonProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
}

/**
 * BizModal Button Component - Consistent button styling for modal actions
 *
 * @example
 * ```tsx
 * <BizModalButton variant="primary" onClick={handleSave}>
 *   Save Changes
 * </BizModalButton>
 * ```
 */
export function BizModalButton({
  onClick,
  variant = 'primary',
  children,
  type = 'button',
  disabled = false,
  className = ''
}: BizModalButtonProps) {
  const variantClasses = {
    primary: 'bg-bizconekt-primary text-white hover:bg-orange-700',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
