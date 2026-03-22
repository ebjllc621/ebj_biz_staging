/**
 * TrendingBadge - "Trending" badge for high activity offers
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { TrendingUp, Flame } from 'lucide-react';

interface TrendingBadgeProps {
  variant?: 'default' | 'hot' | 'compact';
  className?: string;
}

export function TrendingBadge({ variant = 'default', className = '' }: TrendingBadgeProps) {
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium ${className}`}>
        <TrendingUp className="w-3 h-3" />
        Trending
      </span>
    );
  }

  if (variant === 'hot') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-sm font-bold shadow-sm animate-pulse ${className}`}>
        <Flame className="w-4 h-4" />
        Hot Deal!
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium ${className}`}>
      <TrendingUp className="w-4 h-4" />
      Trending
    </span>
  );
}
