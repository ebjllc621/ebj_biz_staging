/**
 * EventSponsorManager - Dashboard manager for event sponsors
 *
 * Lists all events owned by this listing with their sponsors.
 * Provides invite, edit, remove, and analytics functionality.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5 - Task 5.11: EventSponsorManager
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { SponsorInviteModal } from '../SponsorInviteModal';
import { CalendarDays, Users, BarChart2, Trash2, Plus, Loader2 } from 'lucide-react';
import type { EventSponsor, EventSponsorStatus, EventSponsorTier } from '@features/events/types';

interface EventWithSponsors {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  status: string;
  sponsors: EventSponsor[];
}

interface EventSponsorManagerProps {
  listingId: number;
}

const tierColors: Record<EventSponsorTier, string> = {
  title: 'bg-amber-100 text-amber-800',
  gold: 'bg-yellow-100 text-yellow-800',
  silver: 'bg-gray-100 text-gray-700',
  bronze: 'bg-orange-100 text-orange-700',
  community: 'bg-green-100 text-green-700',
};

const statusColors: Record<EventSponsorStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

function EventSponsorManagerContent({ listingId }: EventSponsorManagerProps) {
  const [events, setEvents] = useState<EventWithSponsors[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithSponsors | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<{ sponsorId: number; field: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch listing events
      const eventsRes = await fetch(
        `/api/events?listingId=${listingId}&limit=50`,
        { credentials: 'include' }
      );
      if (!eventsRes.ok) return;
      const eventsData = await eventsRes.json();
      const eventList = eventsData?.data?.data || [];

      if (!Array.isArray(eventList)) {
        setEvents([]);
        return;
      }

      // Fetch sponsors for each event
      const eventsWithSponsors = await Promise.all(
        eventList.map(async (ev: { id: number; title: string; slug: string; start_date: string; status: string }) => {
          try {
            const sponsorsRes = await fetch(`/api/events/${ev.id}/sponsors?includeAll=true`, { credentials: 'include' });
            if (!sponsorsRes.ok) return { ...ev, sponsors: [] };
            const sponsorsData = await sponsorsRes.json();
            return { ...ev, sponsors: sponsorsData?.data?.sponsors || [] };
          } catch {
            return { ...ev, sponsors: [] };
          }
        })
      );

      setEvents(eventsWithSponsors);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInviteSponsor = (event: EventWithSponsors) => {
    setSelectedEvent(event);
    setInviteModalOpen(true);
  };

  const handleSponsorAdded = () => {
    fetchData();
  };

  const handleRemoveSponsor = async (eventId: number, sponsorId: number) => {
    if (!confirm('Remove this sponsor from the event?')) return;
    setDeletingId(sponsorId);
    try {
      await fetchWithCsrf(`/api/events/${eventId}/sponsors/${sponsorId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch {
      alert('Failed to remove sponsor. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (eventId: number, sponsorId: number, newStatus: EventSponsorStatus) => {
    setEditingSponsor({ sponsorId, field: 'status' });
    try {
      await fetchWithCsrf(`/api/events/${eventId}/sponsors/${sponsorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch {
      alert('Failed to update sponsor status. Please try again.');
    } finally {
      setEditingSponsor(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">Loading events and sponsors...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to manage sponsors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <div key={event.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Event header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-biz-navy">{event.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(event.start_date)} &middot; {event.status}
              </p>
            </div>
            <button
              onClick={() => handleInviteSponsor(event)}
              className="flex items-center gap-1.5 px-3 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Invite Sponsor
            </button>
          </div>

          {/* Sponsor list */}
          {event.sponsors.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No sponsors yet. Invite local businesses to sponsor your events.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {event.sponsors.map((sponsor) => (
                <div key={sponsor.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Sponsor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {sponsor.listing_name || 'Unknown Business'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tierColors[sponsor.sponsor_tier]}`}>
                        {sponsor.sponsor_tier}
                      </span>
                    </div>
                    {sponsor.listing_city && (
                      <p className="text-xs text-gray-500 mt-0.5">{sponsor.listing_city}</p>
                    )}
                  </div>

                  {/* Analytics */}
                  <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5" />
                      {sponsor.impression_count} imp.
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {sponsor.click_count} clicks
                    </span>
                  </div>

                  {/* Status change */}
                  <select
                    value={sponsor.status}
                    onChange={(e) => handleStatusChange(event.id, sponsor.id, e.target.value as EventSponsorStatus)}
                    disabled={editingSponsor?.sponsorId === sponsor.id}
                    className={`text-xs px-2 py-1 border rounded-md ${statusColors[sponsor.status]} border-transparent focus:ring-1 focus:ring-biz-orange`}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveSponsor(event.id, sponsor.id)}
                    disabled={deletingId === sponsor.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove sponsor"
                  >
                    {deletingId === sponsor.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {selectedEvent && (
        <SponsorInviteModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onSponsorAdded={handleSponsorAdded}
        />
      )}
    </div>
  );
}

export function EventSponsorManager(props: EventSponsorManagerProps) {
  return (
    <ErrorBoundary>
      <EventSponsorManagerContent {...props} />
    </ErrorBoundary>
  );
}
