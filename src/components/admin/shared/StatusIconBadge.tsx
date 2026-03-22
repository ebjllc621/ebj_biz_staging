/**
 * StatusIconBadge - Styled icon badge for status indicators
 *
 * Replaces emoji status indicators with professional Lucide icons
 * on colored backgrounds following the admin design system.
 *
 * @authority docs/notificationService/admin/3-6-26/NOTIFICATION_ADMIN_MASTER_INDEX_BRAIN_PLAN.md
 * @tier SIMPLE
 */

'use client';

import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';

export type StatusIconBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';
export type StatusIconBadgeSize = 'sm' | 'md' | 'lg';

export interface StatusIconBadgeProps {
  /** Lucide icon component */
  icon: LucideIcon;
  /** Color variant */
  variant: StatusIconBadgeVariant;
  /** Size preset */
  size?: StatusIconBadgeSize;
  /** Optional text label next to icon */
  label?: string;
  /** Show colored background (default: true) */
  showBackground?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<StatusIconBadgeVariant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  muted: 'bg-gray-100 text-gray-600'
};

const sizeConfig: Record<StatusIconBadgeSize, { iconSize: number; padding: string; text: string }> = {
  sm: { iconSize: 14, padding: 'p-1', text: 'text-xs' },
  md: { iconSize: 18, padding: 'p-1.5', text: 'text-sm' },
  lg: { iconSize: 24, padding: 'p-2', text: 'text-base' }
};

/**
 * StatusIconBadge Component
 *
 * Displays an icon with optional label in a colored badge.
 * Used throughout the admin notification system to replace emoji indicators.
 *
 * @example
 * ```tsx
 * <StatusIconBadge icon={CheckCircle} variant="success" size="sm" />
 * <StatusIconBadge icon={AlertTriangle} variant="warning" size="md" label="Warning" />
 * ```
 */
export const StatusIconBadge = memo(function StatusIconBadge({
  icon: Icon,
  variant,
  size = 'md',
  label,
  showBackground = true,
  className = ''
}: StatusIconBadgeProps) {
  const sizeSettings = sizeConfig[size];
  const variantStyle = variantStyles[variant];

  // No background mode - just colored icon
  if (!showBackground) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <Icon size={sizeSettings.iconSize} className={variantStyle.split(' ')[1]} />
        {label && <span className={sizeSettings.text}>{label}</span>}
      </span>
    );
  }

  // With background mode (default)
  return (
    <span className={`inline-flex items-center gap-1 rounded ${sizeSettings.padding} ${variantStyle} ${className}`}>
      <Icon size={sizeSettings.iconSize} />
      {label && <span className={sizeSettings.text}>{label}</span>}
    </span>
  );
});

export default StatusIconBadge;
