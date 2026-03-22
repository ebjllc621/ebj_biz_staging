/**
 * MobileInboxFilters - Horizontal filter pills for mobile inbox
 *
 * Horizontally scrollable filter pills with badge counts and 44px touch targets.
 * Simplified mobile version of RecommendationInboxFilters.
 *
 * @tier SIMPLE
 * @phase Phase 9 - Mobile Experience
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { MobileInboxFilters } from '@features/sharing/components';
 *
 * function MobileInbox() {
 *   const [filter, setFilter] = useState('all');
 *   const counts = { all: 10, unread: 3, saved: 2 };
 *
 *   return (
 *     <MobileInboxFilters
 *       activeFilter={filter}
 *       counts={counts}
 *       onChange={setFilter}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import React from 'react';

type FilterTab = 'all' | 'unread' | 'saved';

interface MobileInboxFiltersProps {
  /** Currently active filter */
  activeFilter: FilterTab;
  /** Callback when filter changes */
  onFilterChange: (filter: FilterTab) => void;
  /** Badge counts for each filter */
  counts: {
    all: number;
    unread: number;
    saved: number;
  };
}

const FILTERS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'saved', label: 'Saved' }
];

export function MobileInboxFilters({
  activeFilter,
  onFilterChange,
  counts
}: MobileInboxFiltersProps) {
  const handleFilterChange = (selectedFilter: FilterTab) => {
    onFilterChange(selectedFilter);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {FILTERS.map((filterOption) => {
          const isActive = activeFilter === filterOption.id;
          const count = counts[filterOption.id];

          return (
            <button
              key={filterOption.id}
              onClick={() => handleFilterChange(filterOption.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm
                min-h-[44px] transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }
              `}
            >
              <span>{filterOption.label}</span>
              {count > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                    ${isActive
                      ? 'bg-white text-blue-600'
                      : 'bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
