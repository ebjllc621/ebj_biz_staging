/**
 * SimilarEventsSection - Similar events section for event detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5 Gap-Fill - Detail Page Polish (G24)
 * @governance Build Map v2.1 ENHANCED
 *
 * Fetches events of the same type and displays up to 4 results,
 * excluding the current event. Returns null when no results.
 *
 * Pattern: RelatedListings.tsx
 */
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { EventCard } from './EventCard';
import type { EventWithCoordinates } from '@features/events/types';

interface SimilarEventsSectionProps {
  /** ID of the current event to exclude from results */
  eventId: number;
  /** Event type filter — returns null if null */
  eventType: string | null;
}

export function SimilarEventsSection({ eventId, eventType }: SimilarEventsSectionProps) {
  const [events, setEvents] = useState<EventWithCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventType) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchSimilar() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          eventType: eventType!,
          status: 'published',
          limit: '5'
        });

        const response = await fetch(
          `/api/events?${params.toString()}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch similar events');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          const allEvents: EventWithCoordinates[] = result.data?.data || [];
          // Filter out current event and take first 4
          const filtered = allEvents
            .filter((e) => e.id !== eventId)
            .slice(0, 4);
          setEvents(filtered);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load similar events');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSimilar();

    return () => {
      isMounted = false;
    };
  }, [eventId, eventType]);

  // Don't render if no event type
  if (!eventType) return null;

  // Don't render if not loading and no results
  if (!isLoading && events.length === 0 && !error) return null;

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-biz-orange" />
          Similar Events
          {events.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({events.length})
            </span>
          )}
        </h2>

        {events.length > 0 && (
          <a
            href="/events"
            className="text-sm text-biz-orange hover:text-biz-orange/80 flex items-center gap-1"
          >
            Browse All Events
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

export default SimilarEventsSection;
