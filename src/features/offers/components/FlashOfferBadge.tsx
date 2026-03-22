/**
 * FlashOfferBadge Component
 * Displays "FLASH DEAL" badge with urgency styling
 *
 * @tier SIMPLE
 * @phase Phase 4 - Advanced Features
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import React from 'react';
import type { FlashUrgencyLevel } from '@features/offers/types';

interface FlashOfferBadgeProps {
  urgencyLevel?: FlashUrgencyLevel;
  className?: string;
}

/**
 * Flash offer badge with urgency-based styling
 * @component
 */
export default function FlashOfferBadge({ urgencyLevel = 'normal', className = '' }: FlashOfferBadgeProps) {
  // Determine styling based on urgency level
  const urgencyStyles = {
    normal: 'bg-orange-500 text-white',
    high: 'bg-red-500 text-white animate-pulse',
    critical: 'bg-red-700 text-white animate-pulse font-bold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${urgencyStyles[urgencyLevel]} ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      FLASH DEAL
    </span>
  );
}
