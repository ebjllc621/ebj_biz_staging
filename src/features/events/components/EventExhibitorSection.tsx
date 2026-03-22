/**
 * EventExhibitorSection - Public grid of exhibitor cards on event detail page
 *
 * Fetches active exhibitors, renders as a uniform card grid (2 cols mobile, 3 desktop),
 * tracks impressions on mount, tracks clicks per card.
 * Returns null if no active exhibitors (no empty state).
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6B - Exhibitor System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MapPin } from 'lucide-react';
import type { EventExhibitor, ExhibitorBoothSize } from '@features/events/types';

interface EventExhibitorSectionProps {
  eventId: number;
  className?: string;
}

const boothSizeBadgeColors: Record<ExhibitorBoothSize, string> = {
  small: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  large: 'bg-purple-100 text-purple-700',
  premium: 'bg-amber-100 text-amber-800',
};

function EventExhibitorSectionContent({ eventId, className = '' }: EventExhibitorSectionProps) {
  const [exhibitors, setExhibitors] = useState<EventExhibitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExhibitors = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/exhibitors`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const fetched: EventExhibitor[] = data?.data?.exhibitors || [];
        setExhibitors(fetched);

        // Track impressions on mount (fire-and-forget)
        if (fetched.length > 0) {
          const ids = fetched.map((ex) => ex.id);
          fetch(`/api/events/${eventId}/exhibitors/impressions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ exhibitorIds: ids }),
          }).catch(() => { /* silently fail */ });
        }
      } catch {
        // Silently fail — exhibitors section is optional
      } finally {
        setIsLoading(false);
      }
    };

    fetchExhibitors();
  }, [eventId]);

  const handleExhibitorClick = useCallback((exhibitorId: number) => {
    // Fire-and-forget click tracking
    fetch(`/api/events/${eventId}/exhibitors/${exhibitorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ click_increment: true }),
    }).catch(() => { /* silently fail */ });
  }, [eventId]);

  // Render nothing while loading or if no exhibitors
  if (isLoading || exhibitors.length === 0) {
    return null;
  }

  return (
    <section className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-biz-navy mb-4">
        Exhibitors
        <span className="ml-2 text-sm font-normal text-gray-500">({exhibitors.length})</span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {exhibitors.map((exhibitor) => {
          const logoSrc = exhibitor.exhibitor_logo || exhibitor.listing_logo;
          const location = [exhibitor.listing_city, exhibitor.listing_state].filter(Boolean).join(', ');

          return (
            <div
              key={exhibitor.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col gap-2"
            >
              {/* Logo + Name */}
              <div className="flex items-center gap-2">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={exhibitor.listing_name || 'Exhibitor'}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">
                      {(exhibitor.listing_name || 'E').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                  {exhibitor.listing_name || 'Exhibitor'}
                </p>
              </div>

              {/* Booth info */}
              <div className="flex flex-wrap gap-1">
                {exhibitor.booth_number && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    Booth {exhibitor.booth_number}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${boothSizeBadgeColors[exhibitor.booth_size]}`}>
                  {exhibitor.booth_size}
                </span>
              </div>

              {/* Description */}
              {exhibitor.exhibitor_description && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {exhibitor.exhibitor_description}
                </p>
              )}

              {/* Location */}
              {location && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span>{location}</span>
                </div>
              )}

              {/* View Listing link */}
              {exhibitor.listing_slug && (
                <Link
                  href={`/listings/${exhibitor.listing_slug}` as Parameters<typeof Link>[0]['href']}
                  onClick={() => handleExhibitorClick(exhibitor.id)}
                  className="mt-auto text-xs text-biz-orange hover:text-orange-600 font-medium transition-colors"
                >
                  View Listing &rarr;
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EventExhibitorSection(props: EventExhibitorSectionProps) {
  return (
    <ErrorBoundary>
      <EventExhibitorSectionContent {...props} />
    </ErrorBoundary>
  );
}
