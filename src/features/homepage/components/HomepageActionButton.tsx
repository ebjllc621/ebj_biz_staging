/**
 * HomepageActionButton - Hero CTA with notification badge overlay
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_3_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@/components/)
 * - Type-safe routing with Route type
 * - Tailwind CSS for styling
 * - NotificationBadge integration from Phase 1
 *
 * Features:
 * - Primary/secondary variant styling
 * - Optional icon support
 * - Notification badge overlay (positioned absolute -top-2 -right-2)
 * - Smooth hover transitions
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { NotificationBadge } from '@/components/common/NotificationBadge';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface HomepageActionButtonProps {
  /** Button label text */
  label: string;
  /** Navigation destination */
  href: string;
  /** Button variant */
  variant: 'primary' | 'secondary';
  /** Notification count for badge */
  notificationCount?: number;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Additional className */
  className?: string;
}

// ============================================================================
// HOMEPAGEACTIONBUTTON COMPONENT
// ============================================================================

/**
 * HomepageActionButton - CTA button with notification badge for hero section
 *
 * @example
 * ```tsx
 * <HomepageActionButton
 *   label="View Dashboard"
 *   href="/dashboard"
 *   variant="primary"
 *   icon={LayoutDashboard}
 *   notificationCount={5}
 * />
 * ```
 */
export function HomepageActionButton({
  label,
  href,
  variant,
  notificationCount = 0,
  icon: Icon,
  className = ''
}: HomepageActionButtonProps) {
  // Base classes for all buttons
  const baseClasses = `
    relative inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
    transition-all duration-200 text-base
  `;

  // Variant-specific classes
  const variantClasses = {
    primary: 'bg-white text-blue-900 hover:bg-blue-50 shadow-lg',
    secondary: 'bg-white/20 border-2 border-white/30 text-white hover:bg-white/30'
  };

  return (
    <Link
      href={href as Route}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      <span>{label}</span>
      {notificationCount > 0 && (
        <NotificationBadge
          count={notificationCount}
          size="sm"
          variant="danger"
          className="absolute -top-2 -right-2"
        />
      )}
    </Link>
  );
}

export default HomepageActionButton;
