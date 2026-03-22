/**
 * SearchResultBadges - Sub-entity count badges for listing cards
 *
 * Displays "Hiring", "Events", and "Deals" pill badges when the listing
 * has active jobs, events, or offers respectively.
 *
 * @tier SIMPLE
 * @phase Phase 4B - SEO & Discovery
 */
'use client';

import { Briefcase, Calendar, Tag } from 'lucide-react';

interface SearchResultBadgesProps {
  jobCount?: number;
  eventCount?: number;
  offerCount?: number;
}

/**
 * SearchResultBadges component
 * Renders horizontal pill badges for active sub-entities.
 * Returns null if all counts are 0 or undefined.
 */
export function SearchResultBadges({ jobCount, eventCount, offerCount }: SearchResultBadgesProps) {
  const hasJobs = (jobCount ?? 0) > 0;
  const hasEvents = (eventCount ?? 0) > 0;
  const hasOffers = (offerCount ?? 0) > 0;

  if (!hasJobs && !hasEvents && !hasOffers) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {hasJobs && (
        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">
          <Briefcase className="w-3 h-3" />
          Hiring
        </span>
      )}
      {hasEvents && (
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-200">
          <Calendar className="w-3 h-3" />
          Events
        </span>
      )}
      {hasOffers && (
        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-200">
          <Tag className="w-3 h-3" />
          Deals
        </span>
      )}
    </div>
  );
}

export default SearchResultBadges;
