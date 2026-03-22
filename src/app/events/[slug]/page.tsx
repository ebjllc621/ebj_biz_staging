/**
 * Event Detail Page - Server Component
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Server Component wrapper with SEO metadata, JSON-LD structured data, and ErrorBoundary protection.
 * Wraps EventDetailClient for client-side interactivity.
 */

import type { Metadata, ResolvingMetadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventDetailClient } from './EventDetailClient';
import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { ErrorService } from '@core/services/ErrorService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Format event date for metadata display
 */
function formatEventDateMeta(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * Generate dynamic SEO metadata for event detail page
 */
export async function generateMetadata(
  { params }: EventDetailPageProps,
  _parent: ResolvingMetadata // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const eventService = getEventService();
    const event = await eventService.getBySlugWithListing(slug);

    if (!event) {
      return {
        title: 'Event Not Found | Bizconekt',
        description: 'The requested event could not be found.',
        robots: { index: false, follow: false }
      };
    }

    const venueName = event.venue_name || event.listing_name || 'Local Venue';
    const dateText = formatEventDateMeta(event.start_date);
    const daysUntil = Math.ceil((new Date(event.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 3 && daysUntil >= 0 ? ' — Happening soon!' : '';
    const metaDescription = `${event.title} at ${venueName}. ${dateText}${urgencyText}. ${event.description?.substring(0, 120) ?? ''}...`;
    const canonicalUrl = `https://bizconekt.com/events/${event.slug}`;
    const coverImage =
      event.banner_image ||
      event.listing_cover_image ||
      'https://bizconekt.com/images/default-event.jpg';

    return {
      title: `${event.title} — ${dateText} | Bizconekt Events`,
      description: metaDescription,

      // OpenGraph (Facebook, LinkedIn, WhatsApp)
      openGraph: {
        type: 'website',
        title: `${event.title} — ${dateText}`,
        description: metaDescription,
        url: canonicalUrl,
        siteName: 'Bizconekt',
        locale: 'en_US',
        images: [
          {
            url: coverImage,
            width: 1200,
            height: 630,
            alt: event.title
          }
        ]
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        site: '@bizconekt',
        title: `${event.title} — ${dateText}`,
        description: metaDescription,
        images: [coverImage]
      },

      // Robots & Crawlers
      robots: {
        index: event.status === 'published',
        follow: true,
        nocache: false,
        googleBot: {
          index: event.status === 'published',
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1
        }
      },

      // Canonical URL
      alternates: {
        canonical: canonicalUrl,
        languages: {
          'en-US': canonicalUrl
        }
      },

      // Keywords
      keywords: [
        event.title,
        event.event_type,
        event.venue_name,
        event.city,
        event.state,
        'events',
        'local events'
      ].filter(Boolean) as string[],

      category: 'Events'
    };
  } catch (error) {
    ErrorService.capture('Error generating event metadata:', error);
    return {
      title: 'Event Details - Bizconekt',
      description: 'View detailed event information, location, and RSVP.'
    };
  }
}

/**
 * Error fallback component for event details page
 */
function EventDetailPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Event
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading this event. Please try refreshing the page.
        </p>
        <a
          href="/events"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Back to Events
        </a>
      </div>
    </div>
  );
}

/**
 * Fetch event and listing data server-side for optimal LCP
 */
async function getEventData(slug: string) {
  try {
    const eventService = getEventService();
    const event = await eventService.getBySlugWithListing(slug);

    if (!event) {
      return { event: null, listing: null };
    }

    // Fetch full listing data for sidebar components
    let listing = null;
    if (event.listing_id) {
      const listingService = getListingService();
      listing = await listingService.getById(event.listing_id);
    }

    return { event, listing };
  } catch (error) {
    ErrorService.capture('Error fetching event data:', error);
    return { event: null, listing: null };
  }
}

/**
 * Generate Schema.org Event structured data
 */
async function generateStructuredData(
  event: Awaited<ReturnType<typeof getEventData>>['event']
) {
  if (!event || event.status !== 'published') return null;

  // Determine attendance mode
  const attendanceModeMap: Record<string, string> = {
    physical: 'https://schema.org/OfflineEventAttendanceMode',
    virtual: 'https://schema.org/OnlineEventAttendanceMode',
    hybrid: 'https://schema.org/MixedEventAttendanceMode'
  };

  const attendanceMode =
    attendanceModeMap[event.location_type] ||
    'https://schema.org/OfflineEventAttendanceMode';

  // Build location object
  const location =
    event.location_type === 'virtual'
      ? {
          '@type': 'VirtualLocation',
          url: event.virtual_link || `https://bizconekt.com/events/${event.slug}`
        }
      : {
          '@type': 'Place',
          name: event.venue_name || undefined,
          address: event.address
            ? {
                '@type': 'PostalAddress',
                streetAddress: event.address,
                addressLocality: event.city || undefined,
                addressRegion: event.state || undefined,
                postalCode: event.zip || undefined,
                addressCountry: 'US'
              }
            : undefined
        };

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || undefined,
    startDate: event.start_date.toISOString(),
    endDate: event.end_date.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode,
    location,
    image: event.banner_image || event.listing_cover_image || undefined
  };

  // Organizer (if listing data available)
  if (event.listing_name) {
    structuredData.organizer = {
      '@type': 'Organization',
      name: event.listing_name,
      url: event.listing_slug
        ? `https://bizconekt.com/listings/${event.listing_slug}`
        : undefined
    };
  }

  // Offers (if ticketed)
  const availability =
    event.remaining_capacity !== null
      ? event.remaining_capacity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock';

  structuredData.offers = {
    '@type': 'Offer',
    price: event.ticket_price ?? 0,
    priceCurrency: 'USD',
    availability,
    url: `https://bizconekt.com/events/${event.slug}`
  };

  // Aggregate review data for AggregateRating (schema.org)
  try {
    const db = getDatabaseService();
    const reviewResult = await db.query<{ avgRating: number; reviewCount: bigint | number }>(
      `SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount
       FROM event_reviews WHERE event_id = ? AND status = 'approved'`,
      [event.id]
    );
    const reviewCount = bigIntToNumber(reviewResult.rows[0]?.reviewCount ?? 0);
    if (reviewCount > 0) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: parseFloat(String(reviewResult.rows[0]?.avgRating || 0)).toFixed(1),
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 1
      };
    }
  } catch {
    // Graceful degradation — aggregateRating is optional
  }

  return structuredData;
}

/**
 * Event Detail Page - Server Component
 */
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;

  // Fetch data server-side for optimal LCP
  const { event, listing } = await getEventData(slug);

  // Generate structured data for SEO
  const structuredData = await generateStructuredData(event);

  return (
    <>
      {/* Schema.org JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      <ErrorBoundary
        fallback={<EventDetailPageError />}
        isolate={true}
        componentName="EventDetailPage"
      >
        <EventDetailClient
          slug={slug}
          initialEvent={event}
          initialListing={listing}
        />
      </ErrorBoundary>
    </>
  );
}
