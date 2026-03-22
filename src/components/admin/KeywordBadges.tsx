/**
 * KeywordBadges - Display keywords as colorful pill badges
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/admin/pageTables/categories/phases/PHASE_2_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - React.memo for performance
 * - Tailwind CSS styling
 * - Accessibility (aria-labels, keyboard support)
 *
 * Features:
 * - Display keywords as pill-style badges
 * - Limit visible keywords (default 5)
 * - Show "+ N more" indicator for overflow
 * - Alternating colors for visual variety (blue, orange, green)
 * - Optional onClick handler for keyword interaction
 *
 * @reference src/components/common/NotificationBadge.tsx - Badge pattern structure
 * @reference src/features/subscription/components/TierBadge.tsx - Pill styling
 * @reference src/features/contacts/components/ContactTagInput.tsx - Tag pill patterns
 */

'use client';

import React, { memo } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface KeywordBadgesProps {
  /** Array of keyword strings */
  keywords: string[] | null;
  /** Maximum keywords to show (default 5) */
  maxVisible?: number;
  /** Color variant (single color or mixed) */
  variant?: 'blue' | 'orange' | 'green' | 'mixed' | 'navy';
  /** Optional click handler for keywords */
  onKeywordClick?: (keyword: string) => void;
  /** Optional className for wrapper */
  className?: string;
}

// ============================================================================
// KEYWORDBADGES COMPONENT
// ============================================================================

/**
 * KeywordBadges - Reusable keyword pill badges
 *
 * Displays keywords as colorful pill badges with overflow handling.
 * Memoized for performance with large category trees (2,328+ categories).
 *
 * @example
 * ```tsx
 * <KeywordBadges
 *   keywords={['nonprofit', 'arts', 'community']}
 *   maxVisible={5}
 *   variant="mixed"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <KeywordBadges
 *   keywords={['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']}
 *   maxVisible={5}
 *   variant="mixed"
 * />
 * // Shows: [tag1] [tag2] [tag3] [tag4] [tag5] [+2 more]
 * ```
 */
export const KeywordBadges = memo(function KeywordBadges({
  keywords,
  maxVisible = 5,
  variant = 'mixed',
  onKeywordClick,
  className = ''
}: KeywordBadgesProps) {
  // Handle null/empty keywords
  if (!keywords || keywords.length === 0) {
    return null;
  }

  // Determine visible and overflow keywords
  const visibleKeywords = keywords.slice(0, maxVisible);
  const overflowCount = keywords.length - maxVisible;

  // Color variants
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    orange: 'bg-orange-500 text-white',
    green: 'bg-green-500 text-white',
    navy: 'bg-[#e8eef5] text-[#1e3a5f]'  // Light navy background with navy text
  };

  // Get color for mixed variant (alternating) or single color
  const getColorClass = (index: number): string => {
    if (variant === 'navy') return colorClasses.navy;
    if (variant !== 'mixed') return colorClasses[variant] || colorClasses.blue;

    const colors: Array<keyof typeof colorClasses> = ['blue', 'orange', 'green'];
    const colorIndex = index % colors.length;
    const colorKey = colors[colorIndex];
    if (!colorKey) return colorClasses.blue; // Fallback (should never happen)
    return colorClasses[colorKey];
  };

  return (
    <div
      className={`flex items-center gap-1 flex-wrap ${className}`}
      aria-label={`Keywords: ${keywords.join(', ')}`}
    >
      {visibleKeywords.map((keyword, index) => {
        const colorClass = getColorClass(index);
        return (
          <span
            key={`${keyword}-${index}`}
            onClick={onKeywordClick ? () => onKeywordClick(keyword) : undefined}
            className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${colorClass}
              ${onKeywordClick ? 'cursor-pointer hover:opacity-80' : ''}
            `}
            role={onKeywordClick ? 'button' : undefined}
            tabIndex={onKeywordClick ? 0 : undefined}
          >
            {keyword}
          </span>
        );
      })}

      {overflowCount > 0 && (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700"
          title={`Additional keywords: ${keywords.slice(maxVisible).join(', ')}`}
        >
          +{overflowCount} more
        </span>
      )}
    </div>
  );
});

export default KeywordBadges;
