/**
 * EventDetailClient - Client Component for Event Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for event details page interactivity.
 * Receives initial data from server component for optimal LCP.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { EventDetailHero } from '@features/events/components/EventDetailHero';
import { EventDetailContent } from '@features/events/components/EventDetailContent';
import { EventDetailSidebar } from '@features/events/components/EventDetailSidebar';
import { EventRSVPModal } from '@features/events/components/EventRSVPModal';
import { EventShareModal } from '@features/events/components/EventShareModal';
import { EventArchiveBadge } from '@features/events/components/EventArchiveBadge';
import { EventCrossSell } from '@features/events/components/EventCrossSell';
import { EventReviewPrompt } from '@features/events/components/EventReviewPrompt';
import { EventReviews } from '@features/events/components/EventReviews';
import { EventSponsorsSection } from '@features/events/components/EventSponsorsSection';
import { EventCoHostBadges } from '@features/events/components/EventCoHostBadges';
import { EventExhibitorSection } from '@features/events/components/EventExhibitorSection';
import { SimilarEventsSection } from '@features/events/components/SimilarEventsSection';
import { EventReportModal } from '@features/events/components/EventReportModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import dynamic from 'next/dynamic';

const BusinessJobsPreview = dynamic(
  () => import('@features/jobs/components/BusinessJobsPreview').then(m => ({ default: m.BusinessJobsPreview })),
  { ssr: false }
);
import { fetchWithCsrf } from '@core/utils/csrf';
import { useAuth } from '@core/hooks/useAuth';
import { useEventAnalytics } from '@features/events/hooks/useEventAnalytics';
import type { EventDetailData, EventRSVPStatus, EventSponsor } from '@features/events/types';
import type { Listing } from '@core/services/ListingService';
import type { GalleryItem } from '@features/media/gallery';

interface EventDetailClientProps {
  /** URL slug for the event */
  slug: string;
  /** Initial event data from server (for optimal LCP) */
  initialEvent: EventDetailData | null;
  /** Initial listing data from server (for sidebar) */
  initialListing: Listing | null;
}

/**
 * EventDetailClientInternal component
 * Handles rendering of event details with 2-column layout
 */
function EventDetailClientInternal({
  slug,
  initialEvent,
  initialListing
}: EventDetailClientProps) {
  const router = useRouter();

  const { user } = useAuth();

  // Use initial data from server
  const [event, setEvent] = useState<EventDetailData | null>(initialEvent);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialEvent);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<EventRSVPStatus>('none');
  const [isRSVPModalOpen, setIsRSVPModalOpen] = useState(false);
  const [reviewsKey, setReviewsKey] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Phase 5: Title sponsor for hero badge
  const [titleSponsor, setTitleSponsor] = useState<EventSponsor | null>(null);
  // Media gallery items for hero carousel
  const [heroMedia, setHeroMedia] = useState<GalleryItem[]>([]);
  // Phase 3B: Recurring series navigation
  const [seriesEvents, setSeriesEvents] = useState<EventDetailData[]>([]);
  const [parentEvent, setParentEvent] = useState<EventDetailData | null>(null);
  // Phase 5A: Native ticketing (Stripe checkout)
  const [allowNativeTicketing, setAllowNativeTicketing] = useState(false);

  const { trackEvent } = useEventAnalytics(event?.id);

  // Fetch event if not provided by server (fallback)
  useEffect(() => {
    if (!initialEvent && slug) {
      fetchEvent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialEvent]);

  // Track page view when event is loaded
  useEffect(() => {
    if (event?.id) {
      trackEvent('page_view', 'direct');
    }
  }, [event?.id, trackEvent]);

  // Phase 5A: Check if native ticketing is available for this event's listing
  useEffect(() => {
    if (!event?.listing_id || !event?.is_ticketed) return;
    fetch(`/api/events/tier-features?listingId=${event.listing_id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.data?.allowNativeTicketing) {
          setAllowNativeTicketing(true);
        }
      })
      .catch(() => { /* silently fail */ });
  }, [event?.listing_id, event?.is_ticketed]);

  // Check RSVP status and save status on mount
  useEffect(() => {
    if (!event?.id) return;

    // Check RSVP status
    fetch(`/api/events/${event.id}/rsvp/status`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.data?.has_rsvped) {
          setRsvpStatus(data.data.rsvp_status || 'confirmed');
        }
      })
      .catch(() => { /* silently fail */ });

    // Check save status
    fetch(`/api/events/${event.id}/save`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.data?.saved) {
          setIsSaved(true);
        }
      })
      .catch(() => { /* silently fail */ });

    // Phase 5: Fetch title sponsor for hero badge
    fetch(`/api/events/${event.id}/sponsors`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const sponsors: EventSponsor[] = data.data?.sponsors || [];
        const title = sponsors.find(s => s.sponsor_tier === 'title' && s.status === 'active');
        if (title) setTitleSponsor(title);
      })
      .catch(() => { /* silently fail */ });

    // Fetch event media for hero carousel
    fetch(`/api/events/${event.id}/media`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const mediaItems = data.data?.media || [];
        const items: GalleryItem[] = mediaItems.map((m: { id: number; media_type: string; file_url: string; alt_text?: string | null; embed_url?: string | null; platform?: string | null }, idx: number) => ({
          id: String(m.id),
          type: m.media_type as 'image' | 'video',
          url: m.file_url,
          alt: m.alt_text || `Event media ${idx + 1}`,
          embedUrl: m.embed_url || undefined,
          videoProvider: m.platform || undefined,
        }));
        setHeroMedia(items);
      })
      .catch(() => { /* silently fail — banner_image fallback remains */ });
  }, [event?.id]);

  // Phase 3B: Fetch recurring series data for navigation
  useEffect(() => {
    if (!event?.id) return;
    // Only fetch if this is a recurring event (parent or child)
    if (!event.is_recurring && !event.parent_event_id) return;

    fetch(`/api/events/${event.id}/series`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSeriesEvents(data.data.events || []);
          setParentEvent(data.data.parent || null);
        }
      })
      .catch(() => { /* non-blocking */ });
  }, [event?.id, event?.is_recurring, event?.parent_event_id]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/events/by-slug/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Event not found');
        }
        throw new Error('Failed to fetch event');
      }

      const data = await response.json();
      const eventData = data.data?.event;
      setEvent(eventData);

      // Fetch listing if event has listing_id
      if (eventData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${eventData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2: Open RSVP modal
  const handleRSVPClick = useCallback(() => {
    if (!event) return;
    setIsRSVPModalOpen(true);
  }, [event]);

  // Phase 2: Save delegated to EventSaveButton — kept for interface compatibility
  const handleSaveClick = useCallback(async () => {
    if (!event) return;
    setIsSaved((prev) => !prev);
  }, [event]);

  // Phase 2: Open share modal
  const handleShareClick = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  // Phase 2: Cancel RSVP
  const handleCancelRSVP = useCallback(async () => {
    if (!event || !user) return;
    try {
      await fetchWithCsrf(
        `/api/events/${event.id}/rsvp?userId=${parseInt(user.id)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      setRsvpStatus('cancelled');
      setEvent(prev => prev ? {
        ...prev,
        rsvp_count: Math.max(0, prev.rsvp_count - 1),
        remaining_capacity: prev.remaining_capacity !== null ? prev.remaining_capacity + 1 : null
      } : null);
    } catch {
      // Silently fail — UI stays in confirmed state
    }
  }, [event, user]);

  const handleRecommendSuccess = useCallback(() => {
    // Could show a toast or update UI state here (Phase 2)
  }, []);

  const handleReportClick = useCallback(() => {
    setIsReportModalOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Back Button Skeleton */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
              {/* Sidebar */}
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">{error || 'Event not found'}</p>
          <button
            onClick={() => router.push('/events')}
            className="mt-4 text-biz-orange hover:text-orange-600 font-medium"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-biz-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Phase 3B: Recurring Series Navigation Banner */}
      {(event.is_recurring || event.parent_event_id) && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              {event.is_recurring && !event.parent_event_id ? (
                <span>This is a recurring event. {seriesEvents.length > 0 ? `${seriesEvents.length} upcoming instance${seriesEvents.length !== 1 ? 's' : ''}.` : ''}</span>
              ) : (
                <span>
                  Part of a recurring series
                  {event.series_index !== null && event.series_index !== undefined ? ` (instance #${event.series_index})` : ''}.
                  {parentEvent?.slug && (
                    <>
                      {' '}
                      <Link href={`/events/${parentEvent.slug}` as Route} className="underline hover:text-blue-900">
                        View series
                      </Link>
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Prev / Next navigation for child instances */}
            {event.parent_event_id && seriesEvents.length > 0 && (() => {
              const currentIndex = seriesEvents.findIndex(e => e.id === event.id);
              const prevEvent = currentIndex > 0 ? seriesEvents[currentIndex - 1] : null;
              const nextEvent = currentIndex < seriesEvents.length - 1 ? seriesEvents[currentIndex + 1] : null;
              return (
                <div className="flex items-center gap-2">
                  {prevEvent?.slug ? (
                    <Link
                      href={`/events/${prevEvent.slug}` as Route}
                      className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-blue-300 cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </span>
                  )}
                  {nextEvent?.slug ? (
                    <Link
                      href={`/events/${nextEvent.slug}` as Route}
                      className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-blue-300 cursor-not-allowed">
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Content Area - 2-COLUMN LAYOUT */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <EventDetailHero
              event={event}
              onRSVPClick={handleRSVPClick}
              onSaveClick={handleSaveClick}
              onShareClick={handleShareClick}
              isSaved={isSaved}
              initialSaved={isSaved}
              rsvpStatus={rsvpStatus}
              onCancelRSVP={handleCancelRSVP}
              onRecommendSuccess={handleRecommendSuccess}
              titleSponsor={titleSponsor}
              onReportClick={handleReportClick}
              mediaItems={heroMedia}
            />

            {/* Phase 4: Archive Badge — shown above content for past/cancelled events */}
            {(new Date(event.end_date) < new Date() || event.status === 'completed' || event.status === 'cancelled') && (
              <EventArchiveBadge event={event} />
            )}

            <EventDetailContent event={event} rsvpStatus={rsvpStatus} />

            {/* Phase 5: Sponsors Section — renders only if sponsors exist */}
            <EventSponsorsSection eventId={event.id} />

            {/* Phase 6A: Co-Host Badges — renders only if active co-hosts exist */}
            <EventCoHostBadges eventId={event.id} className="mt-6" />

            {/* Phase 6B: Exhibitor Section — renders only if active exhibitors exist */}
            <EventExhibitorSection eventId={event.id} className="mt-6" />

            {/* Phase 5 Gap-Fill: Similar Events — shown for all events */}
            <SimilarEventsSection
              eventId={event.id}
              eventType={event.event_type}
            />

            {/* Phase 7: Jobs from this business */}
            {event.listing_id && (
              <BusinessJobsPreview
                listingId={event.listing_id}
                listingName={event.listing_name}
                listingSlug={event.listing_slug}
              />
            )}

            {/* Phase 4: Cross-Sell — only for past events with a listing */}
            {(new Date(event.end_date) < new Date() || event.status === 'completed') && event.listing_id && (
              <EventCrossSell
                listingId={event.listing_id}
                listingName={event.listing_name}
                listingSlug={event.listing_slug}
                currentEventId={event.id}
              />
            )}

            {/* Phase 4: Review Prompt — past events + authenticated users */}
            {(new Date(event.end_date) < new Date() || event.status === 'completed') && user && (
              <EventReviewPrompt
                eventId={event.id}
                eventTitle={event.title}
                businessName={event.listing_name}
                onSubmit={() => setReviewsKey((prev) => prev + 1)}
              />
            )}

            {/* Phase 4: Reviews Section — always visible for past events */}
            {(new Date(event.end_date) < new Date() || event.status === 'completed') && (
              <EventReviews
                key={reviewsKey}
                eventId={event.id}
                eventTitle={event.title}
                listingOwnerId={listing?.user_id ?? undefined}
              />
            )}
          </div>

          {/* Sidebar - BUSINESS INFORMATION */}
          <div className="order-last lg:order-none">
            <EventDetailSidebar
              event={event}
              listing={listing}
            />
          </div>
        </div>
      </div>

      {/* Phase 2: RSVP Modal */}
      <EventRSVPModal
        isOpen={isRSVPModalOpen}
        onClose={() => setIsRSVPModalOpen(false)}
        event={event}
        allowPurchase={allowNativeTicketing}
        onRSVPSuccess={(rsvp) => {
          setRsvpStatus(rsvp.rsvp_status === 'confirmed' ? 'confirmed' : 'none');
          setEvent(prev => prev ? {
            ...prev,
            rsvp_count: prev.rsvp_count + 1,
            remaining_capacity: prev.remaining_capacity !== null ? prev.remaining_capacity - 1 : null
          } : null);
        }}
      />

      {/* Phase 2: Share Modal */}
      <EventShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        event={event}
      />

      {/* Phase 5 Gap-Fill: Report Modal */}
      <EventReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  );
}

/**
 * EventDetailClient with ErrorBoundary wrapper
 * @tier ADVANCED - Requires ErrorBoundary per Build Map v2.1
 */
export function EventDetailClient(props: EventDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="EventDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this event. Please try again.
            </p>
            <a
              href="/events"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse All Events
            </a>
          </div>
        </div>
      }
    >
      <EventDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
