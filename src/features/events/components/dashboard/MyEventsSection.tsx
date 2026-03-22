/**
 * MyEventsSection - 4-tab dashboard component for user's events
 *
 * Tabs:
 *   - Upcoming: Events the user has confirmed RSVPs to (future)
 *   - Saved: Events the user has bookmarked
 *   - Past: Events the user attended
 *   - Created: Events belonging to listings the user owns/manages
 *
 * @tier STANDARD
 * @phase Phase 6A - Dashboard My Events Page
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Monitor,
  Globe,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { EventStatsCards } from './EventStatsCards';
import type { UserEventItem, MyEventsTab } from '@features/events/types';
import { BizModal } from '@/components/ui/BizModal';
import { EventCheckInQR } from '@features/events/components/EventCheckInQR';

// ============================================================================
// Types
// ============================================================================

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface EventsResponse {
  items: UserEventItem[];
  pagination: PaginationMeta;
}

// ============================================================================
// Helpers
// ============================================================================

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Sub-components
// ============================================================================

function LocationIcon({ type }: { type: 'physical' | 'virtual' | 'hybrid' }) {
  if (type === 'virtual') return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
  if (type === 'hybrid') return <Globe className="w-3.5 h-3.5 text-purple-500" />;
  return <MapPin className="w-3.5 h-3.5 text-gray-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-600',
  };
  const cls = configs[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function EventCard({
  event,
  tab,
}: {
  event: UserEventItem;
  tab: MyEventsTab;
}) {
  const [showQR, setShowQR] = useState(false);
  const days = daysUntil(event.start_date);
  const showUrgency = tab === 'saved' && days >= 0 && days <= 3;
  const canShowCheckIn =
    tab === 'upcoming' &&
    event.rsvp_status === 'confirmed' &&
    days >= 0 &&
    (event as UserEventItem & { check_in_enabled?: boolean }).check_in_enabled;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-0">
        {/* Thumbnail */}
        {event.thumbnail || event.banner_image ? (
          <div className="w-24 sm:w-32 flex-shrink-0">
            <img
              src={(event.thumbnail ?? event.banner_image)!}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 sm:w-32 flex-shrink-0 bg-gray-100 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/events/${event.slug}`}
                className="font-semibold text-gray-900 hover:text-[#ed6437] transition-colors line-clamp-1"
              >
                {event.title}
              </Link>
              {event.listing_name && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {event.listing_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Phase 3B: Recurring badge */}
              {event.is_recurring && !event.parent_event_id && (
                <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  <RefreshCw className="w-3 h-3" />
                  {event.recurrence_type ? event.recurrence_type.charAt(0).toUpperCase() + event.recurrence_type.slice(1) : 'Recurring'}
                </span>
              )}
              {event.parent_event_id && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <RefreshCw className="w-3 h-3" />
                  #{event.series_index ?? '?'}
                </span>
              )}
              <StatusBadge status={event.status} />
            </div>
          </div>

          {/* Date + Location */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatEventDate(event.start_date)}
            </span>
            {(event.city || event.venue_name) && (
              <span className="flex items-center gap-1">
                <LocationIcon type={event.location_type} />
                {event.location_type === 'virtual'
                  ? 'Virtual'
                  : event.venue_name
                    ? `${event.venue_name}${event.city ? `, ${event.city}` : ''}`
                    : event.city ?? ''}
              </span>
            )}
          </div>

          {/* Urgency nudge for saved tab */}
          {showUrgency && (
            <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
              This event is in {days === 0 ? 'less than a day' : `${days} day${days !== 1 ? 's' : ''}`} — RSVP before it fills up!
            </p>
          )}

          {/* Past tab: review prompt */}
          {tab === 'past' && event.has_reviewed === 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-700">Leave a review for this event</span>
            </div>
          )}

          {/* Created tab: stats */}
          {tab === 'created' && (
            <EventStatsCards
              rsvpCount={event.rsvp_count}
              totalCapacity={event.total_capacity}
              pageViews={event.page_views ?? 0}
              shares={event.shares ?? 0}
              status={event.status}
            />
          )}

          {/* Upcoming tab: QR check-in button */}
          {canShowCheckIn && (
            <>
              <button
                onClick={() => setShowQR(true)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-biz-orange hover:text-orange-600 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                View Check-In QR
              </button>

              {showQR && (
                <BizModal
                  isOpen={showQR}
                  onClose={() => setShowQR(false)}
                  title="Your Check-In QR Code"
                  size="small"
                >
                  <EventCheckInQR eventId={event.id} size={200} showDetails={true} />
                </BizModal>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="flex gap-0">
            <div className="w-24 sm:w-32 h-28 bg-gray-200 flex-shrink-0" />
            <div className="flex-1 p-4 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: MyEventsTab }) {
  const configs: Record<MyEventsTab, { title: string; description: string }> = {
    upcoming: {
      title: 'No upcoming events',
      description: "You haven't RSVPed to any upcoming events yet.",
    },
    saved: {
      title: 'No saved events',
      description: "You haven't saved any events yet.",
    },
    past: {
      title: 'No past events',
      description: "Events you attend will appear here after they end.",
    },
    created: {
      title: 'No events created',
      description: "Events from your listings will appear here.",
    },
  };

  const { title, description } = configs[tab];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-5">{description}</p>
      <Link
        href="/events"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors"
      >
        Browse Events
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (_page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrevPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const TABS: { id: MyEventsTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'saved', label: 'Saved' },
  { id: 'past', label: 'Past' },
  { id: 'created', label: 'Created' },
];

export function MyEventsSection() {
  const [activeTab, setActiveTab] = useState<MyEventsTab>('upcoming');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventsResponse | null>(null);

  const fetchEvents = useCallback(
    async (tab: MyEventsTab, currentPage: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/user/events?tab=${tab}&page=${currentPage}&limit=10`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message ?? 'Failed to load events'
          );
        }

        const body = await res.json();
        setData(body.data ?? body);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchEvents(activeTab, page);
  }, [activeTab, page, fetchEvents]);

  function handleTabChange(tab: MyEventsTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-600 mt-1">Events you are attending, saved, or managing</p>
        </div>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" />
          Browse Events
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'text-[#ed6437] border-b-2 border-[#ed6437] -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchEvents(activeTab, page)}
              className="text-sm text-red-600 underline mt-1 hover:text-red-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((event) => (
              <EventCard key={event.id} event={event} tab={activeTab} />
            ))}
          </div>
          <Pagination
            pagination={data.pagination}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
