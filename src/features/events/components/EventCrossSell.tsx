/**
 * EventCrossSell - Cross-sell section for past event detail pages
 *
 * Shows active offers and upcoming events from the hosting business.
 * Only renders for past events and only when there is data to display.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4 - Task 4.7: EventCrossSell
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, CalendarDays, ExternalLink } from 'lucide-react';
import type { EventCrossSellOffer } from '@features/events/types';

interface UpcomingEventItem {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  thumbnail: string | null;
  event_type: string | null;
}

interface EventCrossSellProps {
  listingId: number;
  listingName: string | null;
  listingSlug: string | null;
  currentEventId: number;
  className?: string;
}

export function EventCrossSell({
  listingId,
  listingName,
  listingSlug,
  currentEventId,
  className = '',
}: EventCrossSellProps) {
  const [offers, setOffers] = useState<EventCrossSellOffer[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [offersRes, eventsRes] = await Promise.allSettled([
          fetch(`/api/listings/${listingId}/offers?status=active&limit=3`, {
            credentials: 'include',
          }),
          fetch(`/api/events?listingId=${listingId}&isUpcoming=true&limit=4`, {
            credentials: 'include',
          }),
        ]);

        if (offersRes.status === 'fulfilled' && offersRes.value.ok) {
          const offersData = await offersRes.value.json();
          const offersArr = offersData?.data?.data || offersData?.data?.items || offersData?.data || [];
          setOffers(Array.isArray(offersArr) ? offersArr.slice(0, 3) : []);
        }

        if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
          const eventsData = await eventsRes.value.json();
          const eventsArr = eventsData?.data?.data || eventsData?.data?.items || eventsData?.data || [];
          const filtered = Array.isArray(eventsArr)
            ? eventsArr.filter((e: UpcomingEventItem) => e.id !== currentEventId).slice(0, 3)
            : [];
          setUpcomingEvents(filtered);
        }
      } catch {
        // Silently fail — cross-sell is optional
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [listingId, currentEventId]);

  // Render nothing while loading or if no data
  if (isLoading || (offers.length === 0 && upcomingEvents.length === 0)) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDiscount = (offer: EventCrossSellOffer) => {
    if (!offer.discount_type || offer.discount_value === null) return null;
    if (offer.discount_type === 'percentage') return `${offer.discount_value}% off`;
    if (offer.discount_type === 'fixed') return `$${offer.discount_value} off`;
    return null;
  };

  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-biz-navy">
          More from {listingName || 'this business'}
        </h2>
        {listingSlug && (
          <Link
            href={`/listings/${listingSlug}`}
            className="text-sm text-biz-orange hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View listing <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Active Offers */}
      {offers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
            <Tag className="w-4 h-4 text-biz-orange" />
            Active Offers
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {offers.map((offer) => {
              const discount = formatDiscount(offer);
              return (
                <Link
                  key={offer.id}
                  href={`/offers/${offer.slug}`}
                  className="flex-shrink-0 w-48 border border-gray-200 rounded-lg p-3 hover:border-biz-orange hover:shadow-sm transition-all bg-white"
                >
                  {offer.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={offer.thumbnail}
                      alt={offer.title}
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                  )}
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{offer.title}</p>
                  {discount && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      {discount}
                    </span>
                  )}
                  {offer.end_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ends {formatDate(offer.end_date)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
            <CalendarDays className="w-4 h-4 text-biz-orange" />
            Upcoming Events
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map((evt) => (
              <Link
                key={evt.id}
                href={`/events/${evt.slug}`}
                className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-biz-orange hover:shadow-sm transition-all bg-white"
              >
                {evt.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={evt.thumbnail}
                    alt={evt.title}
                    className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{evt.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(evt.start_date)}</p>
                  {evt.event_type && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                      {evt.event_type}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
