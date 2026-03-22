/**
 * SocialProofBadge Component
 * Displays "X claimed today" social proof indicator
 *
 * @tier SIMPLE
 * @phase Phase 4 - Advanced Features
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import React from 'react';

interface SocialProofBadgeProps {
  claimsToday: number;
  trending?: boolean;
  className?: string;
}

/**
 * Social proof badge showing claims count
 * @component
 */
export default function SocialProofBadge({ claimsToday, trending = false, className = '' }: SocialProofBadgeProps) {
  if (claimsToday === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md ${
        trending
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-700 border border-gray-300'
      } ${className}`}
      role="status"
      aria-label={`${claimsToday} ${claimsToday === 1 ? 'person' : 'people'} claimed today${trending ? ', trending' : ''}`}
    >
      <svg
        className={`w-3.5 h-3.5 ${trending ? 'text-green-600' : 'text-gray-600'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <span className="font-medium">
        {claimsToday} {claimsToday === 1 ? 'claimed' : 'claimed'} today
      </span>
      {trending && (
        <svg
          className="w-3 h-3 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-label="Trending"
        >
          <path
            fillRule="evenodd"
            d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}
