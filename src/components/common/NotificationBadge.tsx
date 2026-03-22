/**
 * NotificationBadge - Displays notification count in a circular badge
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Tailwind CSS for styling
 * - Size and variant support
 * - Conditional rendering (hide when count is 0)
 *
 * Features:
 * - Display count in circular badge
 * - Show "99+" when count exceeds maxCount
 * - Multiple size variants (sm, md, lg)
 * - Multiple color variants (primary, danger, warning)
 * - Optional showZero flag
 */

'use client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NotificationBadgeProps {
  /** Number to display in badge */
  count: number;
  /** Maximum count to show (defaults to 99) */
  maxCount?: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'danger' | 'warning';
  /** Optional className for positioning */
  className?: string;
  /** Show badge even when count is 0 */
  showZero?: boolean;
}

// ============================================================================
// NOTIFICATIONBADGE COMPONENT
// ============================================================================

/**
 * NotificationBadge - Reusable count badge component
 *
 * @example
 * ```tsx
 * <NotificationBadge count={5} size="md" variant="danger" />
 * <NotificationBadge count={150} maxCount={99} /> // Shows "99+"
 * ```
 */
export function NotificationBadge({
  count,
  maxCount = 99,
  size = 'md',
  variant = 'danger',
  className = '',
  showZero = false
}: NotificationBadgeProps) {
  // Hide badge if count is 0 and showZero is false
  if (count <= 0 && !showZero) return null;

  // Format display count
  const displayCount = count > maxCount ? `${maxCount}+` : count;

  // Size classes
  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-[10px]',
    md: 'min-w-[20px] h-5 text-xs',
    lg: 'min-w-[24px] h-6 text-sm'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white',
    danger: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black'
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full px-1 font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
}

export default NotificationBadge;
