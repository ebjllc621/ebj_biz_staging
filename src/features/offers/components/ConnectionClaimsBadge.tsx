/**
 * ConnectionClaimsBadge - "X of your friends claimed this" badge
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Users } from 'lucide-react';

interface ConnectionClaimsBadgeProps {
  count: number;
  maxDisplay?: number;
  className?: string;
}

export function ConnectionClaimsBadge({
  count,
  maxDisplay = 5,
  className = '',
}: ConnectionClaimsBadgeProps) {
  if (count === 0) {
    return null;
  }

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count;
  const label = count === 1 ? 'friend claimed this' : 'friends claimed this';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm ${className}`}>
      <Users className="w-4 h-4" />
      <span>
        <strong>{displayCount}</strong> {label}
      </span>
    </span>
  );
}
