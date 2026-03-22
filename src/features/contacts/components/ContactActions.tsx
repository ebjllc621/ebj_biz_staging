/**
 * ContactActions - Reusable touch action buttons component
 *
 * @tier STANDARD
 * @phase Contacts Enhancement Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @brain-plan docs/components/contacts/phases/PHASE_2_CONTACT_DISPLAY_CONTENT_BRAIN_PLAN.md
 *
 * Provides quick contact actions (Call, Email, SMS, Message) with:
 * - Color-coded buttons for visual recognition
 * - 44px minimum touch targets for mobile accessibility
 * - Multiple layout variants (horizontal, vertical, grid)
 * - Size options (sm, md, lg)
 * - Full accessibility with aria-labels
 *
 * Touch Actions:
 * - Call: tel: link (green/success)
 * - Email: mailto: link (blue/primary #022641)
 * - SMS: sms: link (orange #ed6437)
 * - Message: In-app message callback (gray/secondary)
 *
 * @reference src/features/contacts/components/ContactCard.tsx - Touch action patterns
 */
'use client';

import { memo } from 'react';
import { Phone, Mail, MessageSquare, MessageCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Individual touch action button props
 */
export interface TouchActionProps {
  /** Icon component from lucide-react */
  icon: React.ReactNode;
  /** Button label text */
  label: string;
  /** Action URL or callback */
  action: string | (() => void);
  /** Button background color (Tailwind class) */
  bgColor: string;
  /** Button hover color (Tailwind class) */
  hoverColor: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Accessibility label */
  ariaLabel: string;
}

/**
 * ContactActions component props
 */
export interface ContactActionsProps {
  /** Phone number for tel: link */
  phone: string | null;
  /** Email address for mailto: link */
  email: string | null;
  /** Whether contact is connected (enables in-app messaging) */
  isConnected: boolean;
  /** Callback for in-app message action */
  onMessage?: () => void;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical' | 'grid';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show labels below buttons */
  showLabels?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Size configurations for touch buttons
 * All sizes meet 44px minimum touch target requirement
 */
const SIZE_CONFIG = {
  sm: {
    button: 'min-h-[44px] min-w-[44px] px-3 py-2',
    icon: 'w-4 h-4',
    text: 'text-xs',
  },
  md: {
    button: 'min-h-[44px] min-w-[44px] px-4 py-2.5',
    icon: 'w-5 h-5',
    text: 'text-sm',
  },
  lg: {
    button: 'min-h-[44px] min-w-[44px] px-5 py-3',
    icon: 'w-6 h-6',
    text: 'text-base',
  },
} as const;

/**
 * Layout configurations
 */
const LAYOUT_CONFIG = {
  horizontal: 'flex flex-row flex-wrap gap-2',
  vertical: 'flex flex-col gap-2',
  grid: 'grid grid-cols-2 gap-2',
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

function ContactActionsComponent({
  phone,
  email,
  isConnected,
  onMessage,
  variant = 'horizontal',
  size = 'md',
  showLabels = false,
  className = '',
}: ContactActionsProps) {
  const sizeClasses = SIZE_CONFIG[size];
  const layoutClasses = LAYOUT_CONFIG[variant];

  // Build action buttons array
  const actions: TouchActionProps[] = [];

  // Call action (only if phone exists)
  if (phone) {
    actions.push({
      icon: <Phone className={sizeClasses.icon} />,
      label: 'Call',
      action: `tel:${phone}`,
      bgColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      ariaLabel: `Call ${phone}`,
    });
  }

  // Email action (only if email exists)
  if (email) {
    actions.push({
      icon: <Mail className={sizeClasses.icon} />,
      label: 'Email',
      action: `mailto:${email}`,
      bgColor: 'bg-[#022641]',
      hoverColor: 'hover:bg-[#033a5c]',
      ariaLabel: `Email ${email}`,
    });
  }

  // SMS action (only if phone exists)
  if (phone) {
    actions.push({
      icon: <MessageSquare className={sizeClasses.icon} />,
      label: 'SMS',
      action: `sms:${phone}`,
      bgColor: 'bg-[#ed6437]',
      hoverColor: 'hover:bg-[#d55730]',
      ariaLabel: `Send SMS to ${phone}`,
    });
  }

  // In-app Message action (only if connected and callback provided)
  if (isConnected && onMessage) {
    actions.push({
      icon: <MessageCircle className={sizeClasses.icon} />,
      label: 'Message',
      action: onMessage,
      bgColor: 'bg-gray-600',
      hoverColor: 'hover:bg-gray-700',
      ariaLabel: 'Send in-app message',
    });
  }

  // If no actions available, return null
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`${layoutClasses} ${className}`}>
      {actions.map((action, index) => {
        const isCallback = typeof action.action === 'function';
        const baseClasses = `
          ${sizeClasses.button}
          ${action.bgColor}
          ${action.hoverColor}
          text-white
          rounded-lg
          transition-colors
          flex items-center justify-center gap-2
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        `.trim();

        const content = (
          <>
            {action.icon}
            {showLabels && (
              <span className={sizeClasses.text}>{action.label}</span>
            )}
          </>
        );

        // Render as button for callbacks, link for URLs
        if (isCallback) {
          return (
            <button
              key={index}
              onClick={action.action as () => void}
              className={baseClasses}
              aria-label={action.ariaLabel}
              disabled={action.disabled}
            >
              {content}
            </button>
          );
        } else {
          return (
            <a
              key={index}
              href={action.action as string}
              className={baseClasses}
              aria-label={action.ariaLabel}
              onClick={(e) => e.stopPropagation()} // Prevent parent click handlers
            >
              {content}
            </a>
          );
        }
      })}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ContactActions = memo(ContactActionsComponent);
export default ContactActions;
