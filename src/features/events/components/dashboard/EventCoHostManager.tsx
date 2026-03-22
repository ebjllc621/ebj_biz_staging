/**
 * EventCoHostManager - Dashboard manager for event co-hosts
 *
 * Lists all events owned by this listing with their co-hosts.
 * Provides invite, status change, and remove functionality.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6A - Co-Host System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { CoHostInviteModal } from '../CoHostInviteModal';
import { OrganizerOnboardingModal } from '../OrganizerOnboardingModal';
import { CalendarDays, Trash2, Plus, Loader2 } from 'lucide-react';
import type { EventCoHost, EventCoHostStatus, EventCoHostRole } from '@features/events/types';

interface EventWithCoHosts {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  status: string;
  co_hosts: EventCoHost[];
}

interface EventCoHostManagerProps {
  listingId: number;
  /** Listing subscription tier — used to gate onboarding modal to preferred/premium */
  tier?: string;
}

const roleColors: Record<EventCoHostRole, string> = {
  organizer: 'bg-blue-100 text-blue-800',
  vendor: 'bg-purple-100 text-purple-800',
  performer: 'bg-pink-100 text-pink-800',
  exhibitor: 'bg-amber-100 text-amber-800',
};

const statusColors: Record<EventCoHostStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-700',
  declined: 'bg-gray-100 text-gray-600',
  removed: 'bg-red-100 text-red-700',
};

function EventCoHostManagerContent({ listingId, tier = 'essentials' }: EventCoHostManagerProps) {
  const [events, setEvents] = useState<EventWithCoHosts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithCoHosts | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingCoHost, setEditingCoHost] = useState<{ coHostId: number; field: string } | null>(null);
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

      // Fetch co-hosts for each event
      const eventsWithCoHosts = await Promise.all(
        eventList.map(async (ev: { id: number; title: string; slug: string; start_date: string; status: string }) => {
          try {
            const coHostsRes = await fetch(`/api/events/${ev.id}/co-hosts?includeAll=true`, { credentials: 'include' });
            if (!coHostsRes.ok) return { ...ev, co_hosts: [] };
            const coHostsData = await coHostsRes.json();
            return { ...ev, co_hosts: coHostsData?.data?.co_hosts || [] };
          } catch {
            return { ...ev, co_hosts: [] };
          }
        })
      );

      setEvents(eventsWithCoHosts);
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

  const handleInviteCoHost = (event: EventWithCoHosts) => {
    setSelectedEvent(event);
    setInviteModalOpen(true);
  };

  const handleCoHostAdded = () => {
    fetchData();
  };

  const handleRemoveCoHost = async (eventId: number, coHostId: number) => {
    if (!confirm('Remove this co-host from the event?')) return;
    setDeletingId(coHostId);
    try {
      await fetchWithCsrf(`/api/events/${eventId}/co-hosts/${coHostId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch {
      alert('Failed to remove co-host. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (eventId: number, coHostId: number, newStatus: EventCoHostStatus) => {
    setEditingCoHost({ coHostId, field: 'status' });
    try {
      await fetchWithCsrf(`/api/events/${eventId}/co-hosts/${coHostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch {
      alert('Failed to update co-host status. Please try again.');
    } finally {
      setEditingCoHost(null);
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
        <span className="ml-2 text-gray-500">Loading events and co-hosts...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to manage co-hosts.</p>
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
              onClick={() => handleInviteCoHost(event)}
              className="flex items-center gap-1.5 px-3 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Invite Co-Host
            </button>
          </div>

          {/* Co-host list */}
          {event.co_hosts.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No co-hosts yet. Invite local businesses to co-host your events.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {event.co_hosts.map((coHost) => (
                <div key={coHost.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Co-host info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {coHost.listing_name || 'Unknown Business'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${roleColors[coHost.co_host_role]}`}>
                        {coHost.co_host_role}
                      </span>
                    </div>
                    {coHost.listing_city && (
                      <p className="text-xs text-gray-500 mt-0.5">{coHost.listing_city}</p>
                    )}
                  </div>

                  {/* Status change */}
                  <select
                    value={coHost.status}
                    onChange={(e) => handleStatusChange(event.id, coHost.id, e.target.value as EventCoHostStatus)}
                    disabled={editingCoHost?.coHostId === coHost.id}
                    className={`text-xs px-2 py-1 border rounded-md ${statusColors[coHost.status]} border-transparent focus:ring-1 focus:ring-biz-orange`}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="declined">Declined</option>
                    <option value="removed">Removed</option>
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveCoHost(event.id, coHost.id)}
                    disabled={deletingId === coHost.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remove co-host"
                  >
                    {deletingId === coHost.id ? (
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
        <CoHostInviteModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onCoHostAdded={handleCoHostAdded}
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

export function EventCoHostManager(props: EventCoHostManagerProps) {
  return (
    <ErrorBoundary>
      <EventCoHostManagerContent {...props} />
    </ErrorBoundary>
  );
}
