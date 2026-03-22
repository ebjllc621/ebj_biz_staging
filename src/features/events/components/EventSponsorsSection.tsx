/**
 * EventSponsorsSection - Complete sponsors display for event detail page
 *
 * Fetches active sponsors, groups by tier for visual hierarchy,
 * tracks impressions on mount, tracks clicks via card callbacks.
 * Returns null if no active sponsors (no empty state rendered).
 *
 * Layout:
 *   Title sponsor — full-width card
 *   Gold/Silver — flex row of medium/small cards
 *   Bronze — inline text list
 *   Community — inline badge list
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5 - Task 5.9: EventSponsorsSection
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventSponsorCard } from './EventSponsorCard';
import type { EventSponsor } from '@features/events/types';

interface EventSponsorsSectionProps {
  eventId: number;
  className?: string;
}

function EventSponsorsSectionContent({ eventId, className = '' }: EventSponsorsSectionProps) {
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSponsors = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/sponsors`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const fetched: EventSponsor[] = data?.data?.sponsors || [];
        setSponsors(fetched);

        // Track impressions on mount (fire-and-forget)
        if (fetched.length > 0) {
          const ids = fetched.map((s) => s.id);
          fetch(`/api/events/${eventId}/sponsors/impressions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sponsorIds: ids }),
          }).catch(() => { /* silently fail */ });
        }
      } catch {
        // Silently fail — sponsors section is optional
      } finally {
        setIsLoading(false);
      }
    };

    fetchSponsors();
  }, [eventId]);

  const handleSponsorClick = useCallback((sponsorId: number) => {
    // Fire-and-forget click tracking
    fetch(`/api/events/${eventId}/sponsors/${sponsorId}/click`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => { /* silently fail */ });
  }, [eventId]);

  // Render nothing while loading or if no sponsors
  if (isLoading || sponsors.length === 0) {
    return null;
  }

  // Group by tier
  const titleSponsors = sponsors.filter((s) => s.sponsor_tier === 'title');
  const goldSponsors = sponsors.filter((s) => s.sponsor_tier === 'gold');
  const silverSponsors = sponsors.filter((s) => s.sponsor_tier === 'silver');
  const bronzeSponsors = sponsors.filter((s) => s.sponsor_tier === 'bronze');
  const communitySponsors = sponsors.filter((s) => s.sponsor_tier === 'community');

  return (
    <section className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-biz-navy mb-4">Event Sponsors</h2>

      {/* Title sponsor — full-width */}
      {titleSponsors.map((sponsor) => (
        <div key={sponsor.id} className="mb-4">
          <EventSponsorCard sponsor={sponsor} onSponsorClick={handleSponsorClick} />
        </div>
      ))}

      {/* Gold + Silver sponsors — flex row */}
      {(goldSponsors.length > 0 || silverSponsors.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {goldSponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex-1 min-w-[160px] max-w-[240px]">
              <EventSponsorCard sponsor={sponsor} onSponsorClick={handleSponsorClick} />
            </div>
          ))}
          {silverSponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex-1 min-w-[130px] max-w-[200px]">
              <EventSponsorCard sponsor={sponsor} onSponsorClick={handleSponsorClick} />
            </div>
          ))}
        </div>
      )}

      {/* Bronze sponsors — inline text list */}
      {bronzeSponsors.length > 0 && (
        <div className="mb-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Bronze:</span>
          {bronzeSponsors.map((sponsor, i) => (
            <span key={sponsor.id}>
              {sponsor.listing_slug ? (
                <a
                  href={`/listings/${sponsor.listing_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSponsorClick(sponsor.id)}
                  className="text-sm text-biz-navy hover:text-biz-orange transition-colors"
                >
                  {sponsor.listing_name || 'Sponsor'}
                </a>
              ) : (
                <span className="text-sm text-gray-700">{sponsor.listing_name || 'Sponsor'}</span>
              )}
              {i < bronzeSponsors.length - 1 && <span className="text-gray-400 mx-1.5">•</span>}
            </span>
          ))}
        </div>
      )}

      {/* Community sponsors — badge list */}
      {communitySponsors.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Community:</span>
          {communitySponsors.map((sponsor, i) => (
            <span key={sponsor.id}>
              {sponsor.listing_slug ? (
                <a
                  href={`/listings/${sponsor.listing_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSponsorClick(sponsor.id)}
                  className="text-sm text-gray-600 hover:text-biz-orange transition-colors"
                >
                  {sponsor.listing_name || 'Sponsor'}
                </a>
              ) : (
                <span className="text-sm text-gray-600">{sponsor.listing_name || 'Sponsor'}</span>
              )}
              {i < communitySponsors.length - 1 && <span className="text-gray-400 mx-1">{',' }</span>}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function EventSponsorsSection(props: EventSponsorsSectionProps) {
  return (
    <ErrorBoundary>
      <EventSponsorsSectionContent {...props} />
    </ErrorBoundary>
  );
}
