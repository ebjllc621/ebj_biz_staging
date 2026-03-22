/**
 * EventExhibitorManager - Dashboard manager for event exhibitors
 *
 * Lists all events owned by this listing with their exhibitors.
 * Provides invite, status change, and remove functionality.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6B - Exhibitor System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ExhibitorInviteModal } from '../ExhibitorInviteModal';
import { OrganizerOnboardingModal } from '../OrganizerOnboardingModal';
import { CalendarDays, Trash2, Plus, Loader2 } from 'lucide-react';
import type { EventExhibitor, EventExhibitorStatus, ExhibitorBoothSize } from '@features/events/types';

interface EventWithExhibitors {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  status: string;
  exhibitors: EventExhibitor[];
}

interface EventExhibitorManagerProps {
  listingId: number;
  /** Listing subscription tier — used to gate onboarding modal to preferred/premium */
  tier?: string;
}

const boothSizeColors: Record<ExhibitorBoothSize, string> = {
  small: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  large: 'bg-purple-100 text-purple-800',
  premium: 'bg-amber-100 text-amber-800',
};

const statusColors: Record<EventExhibitorStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-700',
};

function EventExhibitorManagerContent({ listingId, tier = 'essentials' }: EventExhibitorManagerProps) {
  const [events, setEvents] = useState<EventWithExhibitors[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithExhibitors | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingExhibitor, setEditingExhibitor] = useState<{ exhibitorId: number; field: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

      // Fetch exhibitors for each event
      const eventsWithExhibitors = await Promise.all(
        eventList.map(async (ev: { id: number; title: string; slug: string; start_date: string; status: string }) => {
          try {
            const exhibitorsRes = await fetch(`/api/events/${ev.id}/exhibitors?includeAll=true`, { credentials: 'include' });
            if (!exhibitorsRes.ok) return { ...ev, exhibitors: [] };
            const exhibitorsData = await exhibitorsRes.json();
            return { ...ev, exhibitors: exhibitorsData?.data?.exhibitors || [] };
          } catch {
            return { ...ev, exhibitors: [] };
          }
        })
      );

      setEvents(eventsWithExhibitors);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Phase 6D: Auto-trigger onboarding modal for Preferred/Premium tier users on first visit
  useEffect(() => {
    const key = `bk_organizer_onboarding_seen_${listingId}`;
    if (!localStorage.getItem(key) && (tier === 'preferred' || tier === 'premium')) {
      setShowOnboarding(true);
    }
  }, [listingId, tier]);

  const handleInviteExhibitor = (event: EventWithExhibitors) => {
    setSelectedEvent(event);
    setInviteModalOpen(true);
  };

  const handleExhibitorAdded = () => {
    fetchData();
  };

  const handleRemoveExhibitor = async (eventId: number, exhibitorId: number) => {
    if (!confirm('Remove this exhibitor from the event?')) return;
    setDeletingId(exhibitorId);
    try {
      await fetchWithCsrf(`/api/events/${eventId}/exhibitors/${exhibitorId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch {
      alert('Failed to remove exhibitor. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (eventId: number, exhibitorId: number, newStatus: EventExhibitorStatus) => {
    setEditingExhibitor({ exhibitorId, field: 'status' });
    try {
      await fetchWithCsrf(`/api/events/${eventId}/exhibitors/${exhibitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch {
      alert('Failed to update exhibitor status. Please try again.');
    } finally {
      setEditingExhibitor(null);
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
        <span className="ml-2 text-gray-500">Loading events and exhibitors...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to manage exhibitors.</p>
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
              onClick={() => handleInviteExhibitor(event)}
              className="flex items-center gap-1.5 px-3 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Invite Exhibitor
            </button>
          </div>

          {/* Exhibitor list */}
          {event.exhibitors.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No exhibitors yet. Invite local businesses to exhibit at your events.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {event.exhibitors.map((exhibitor) => (
                <div key={exhibitor.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Exhibitor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {exhibitor.listing_name || 'Unknown Business'}
                      </span>
                      {exhibitor.booth_number && (
                        <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-700">
                          Booth: {exhibitor.booth_number}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${boothSizeColors[exhibitor.booth_size]}`}>
                        {exhibitor.booth_size}
                      </span>
                    </div>
                    {exhibitor.listing_city && (
                      <p className="text-xs text-gray-500 mt-0.5">{exhibitor.listing_city}</p>
                    )}
                  </div>

                  {/* Status change */}
                  <select
                    value={exhibitor.status}
                    onChange={(e) => handleStatusChange(event.id, exhibitor.id, e.target.value as EventExhibitorStatus)}
                    disabled={editingExhibitor?.exhibitorId === exhibitor.id}
                    className={`text-xs px-2 py-1 border rounded-md ${statusColors[exhibitor.status]} border-transparent focus:ring-1 focus:ring-biz-orange`}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="declined">Declined</option>
                    <option value="removed">Removed</option>
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveExhibitor(event.id, exhibitor.id)}
                    disabled={deletingId === exhibitor.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove exhibitor"
                  >
                    {deletingId === exhibitor.id ? (
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
        <ExhibitorInviteModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onExhibitorAdded={handleExhibitorAdded}
        />
      )}

      {/* Phase 6D: Organizer Onboarding Modal */}
      {events.length > 0 && (
        <OrganizerOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          eventId={events[0]!.id}
          listingId={listingId}
          tier={tier}
        />
      )}
    </div>
  );
}

export function EventExhibitorManager(props: EventExhibitorManagerProps) {
  return (
    <ErrorBoundary>
      <EventExhibitorManagerContent {...props} />
    </ErrorBoundary>
  );
}
