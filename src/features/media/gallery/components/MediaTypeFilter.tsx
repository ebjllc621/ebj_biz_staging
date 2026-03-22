/**
 * MediaTypeFilter - Tab bar for filtering gallery items by media type
 *
 * Only renders when both photos and videos are present.
 * Caller is responsible for the render condition.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import type { MediaFilterType, MediaTypeFilterProps } from '../types/gallery-types';

const TABS: { key: MediaFilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'photos', label: 'Photos' },
  { key: 'videos', label: 'Videos' }
];

export function MediaTypeFilter({
  activeFilter,
  onFilterChange,
  photosCount,
  videosCount
}: MediaTypeFilterProps) {
  const allCount = photosCount + videosCount;

  function getCount(key: MediaFilterType): number {
    if (key === 'all') return allCount;
    if (key === 'photos') return photosCount;
    return videosCount;
  }

  return (
    <div className="flex gap-0 border-b border-gray-200 mb-4" role="tablist" aria-label="Filter gallery by media type">
      {TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-biz-orange ${
              isActive
                ? 'border-b-2 border-biz-orange text-biz-orange -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 -mb-px'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${isActive ? 'text-biz-orange' : 'text-gray-400'}`}>
              ({getCount(tab.key)})
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default MediaTypeFilter;
