/**
 * LayoutAwareMenuItem - Menu Item with Visibility Indicators
 *
 * @description Menu item component with visual indicators for hidden or locked features
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Dashboard Synchronization
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_6_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for listing manager
 * - EyeOff icon for hidden features
 * - Lock icon for tier-restricted features
 * - Dimmed styling for hidden/locked items
 * - Route typing with 'next' Route type
 *
 * USAGE:
 * ```tsx
 * <LayoutAwareMenuItem
 *   menuKey="contact-info"
 *   label="Contact Info"
 *   href="contact-info"
 *   icon={Phone}
 *   isVisible={true}
 *   isLocked={false}
 * />
 * ```
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { EyeOff, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface LayoutAwareMenuItemProps {
  /** Menu item key */
  menuKey: string;
  /** Display label */
  label: string;
  /** Route href */
  href: string;
  /** Icon component */
  icon?: LucideIcon;
  /** Whether item is currently active */
  isActive?: boolean;
  /** Feature visibility state (from useListingLayoutSync) */
  isVisible?: boolean;
  /** Feature locked state (tier-restricted) */
  isLocked?: boolean;
  /** Required tier for locked features */
  requiredTier?: string;
  /** Click handler */
  onClick?: () => void;
  /** Badge count (notifications) */
  badge?: number | string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LayoutAwareMenuItem - Menu item with visibility indicators
 *
 * Shows visual indicators for hidden or locked features based on
 * the listing's section layout preferences.
 *
 * @param menuKey - Menu item key
 * @param label - Display label
 * @param href - Route href
 * @param icon - Icon component
 * @param isActive - Whether item is currently active
 * @param isVisible - Feature visibility state
 * @param isLocked - Feature locked state
 * @param requiredTier - Required tier for locked features
 * @param onClick - Click handler
 * @param badge - Badge count
 * @returns Menu item with visibility indicators
 *
 * @example
 * ```tsx
 * <LayoutAwareMenuItem
 *   menuKey="analytics"
 *   label="Analytics"
 *   href="analytics"
 *   icon={BarChart3}
 *   isLocked={true}
 *   requiredTier="professional"
 * />
 * ```
 */
export function LayoutAwareMenuItem({
  label,
  href,
  icon: Icon,
  isActive = false,
  isVisible = true,
  isLocked = false,
  requiredTier,
  onClick,
  badge
}: LayoutAwareMenuItemProps) {
  // Determine visual state
  const isHidden = !isVisible && !isLocked;
  const showIndicator = isHidden || isLocked;

  // Style classes based on state
  const baseClasses = 'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors';
  const activeClasses = isActive
    ? 'bg-[#ed6437]/10 text-[#ed6437]'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  const dimmedClasses = (isHidden || isLocked) ? 'opacity-60' : '';

  return (
    <Link
      href={href as Route}
      onClick={onClick}
      className={`${baseClasses} ${activeClasses} ${dimmedClasses}`}
      title={
        isLocked
          ? `Requires ${requiredTier} tier`
          : isHidden
          ? 'Hidden on listing page'
          : label
      }
    >
      {/* Icon */}
      {Icon && (
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${
            isActive ? 'text-[#ed6437]' : 'text-gray-400 group-hover:text-gray-600'
          }`}
        />
      )}

      {/* Label */}
      <span className="flex-1 truncate">{label}</span>

      {/* Visibility Indicators */}
      {showIndicator && (
        <div className="flex items-center gap-1">
          {isLocked && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs"
              title={`Requires ${requiredTier} tier`}
            >
              <Lock className="w-3 h-3" />
            </span>
          )}
          {isHidden && !isLocked && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-xs"
              title="Hidden on listing page"
            >
              <EyeOff className="w-3 h-3" />
            </span>
          )}
        </div>
      )}

      {/* Badge */}
      {badge !== undefined && !showIndicator && (
        <span className="px-2 py-0.5 bg-[#ed6437] text-white rounded-full text-xs font-medium">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default LayoutAwareMenuItem;
