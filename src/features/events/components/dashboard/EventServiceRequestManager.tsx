/**
 * EventServiceRequestManager - Dashboard manager for event service requests
 *
 * Lists all events owned by this listing with their service requests.
 * Provides create, publish (draft→open), cancel, and link-to-quote-bids functionality.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6C - Service Procurement (Quote Integration)
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EventServiceRequestModal } from '../EventServiceRequestModal';
import {
  CalendarDays, Plus, Loader2, ExternalLink, Trash2, Send, DollarSign,
} from 'lucide-react';
import type {
  EventServiceRequest,
  EventServiceCategory,
  EventServiceRequestStatus,
  EventServiceRequestPriority,
} from '@features/events/types';

interface EventWithServiceRequests {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  status: string;
  service_requests: EventServiceRequest[];
}

interface EventServiceRequestManagerProps {
  listingId: number;
}

const statusColors: Record<EventServiceRequestStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  fulfilled: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<EventServiceRequestPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const categoryColors: Record<EventServiceCategory, string> = {
  catering: 'bg-amber-100 text-amber-800',
  av_equipment: 'bg-indigo-100 text-indigo-800',
  security: 'bg-red-100 text-red-800',
  decor: 'bg-pink-100 text-pink-800',
  photography: 'bg-cyan-100 text-cyan-800',
  entertainment: 'bg-purple-100 text-purple-800',
  transportation: 'bg-emerald-100 text-emerald-800',
  venue_services: 'bg-teal-100 text-teal-800',
  cleaning: 'bg-lime-100 text-lime-800',
  staffing: 'bg-sky-100 text-sky-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<EventServiceCategory, string> = {
  catering: 'Catering',
  av_equipment: 'AV & Sound',
  security: 'Security',
  decor: 'Decor',
  photography: 'Photography',
  entertainment: 'Entertainment',
  transportation: 'Transportation',
  venue_services: 'Venue Services',
  cleaning: 'Cleaning',
  staffing: 'Staffing',
  other: 'Other',
};

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return 'Open Budget';
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return `Up to $${max!.toLocaleString()}`;
}

function EventServiceRequestManagerContent({ listingId }: EventServiceRequestManagerProps) {
  const [events, setEvents] = useState<EventWithServiceRequests[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithServiceRequests | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
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

      // Fetch service requests for each event
      const eventsWithRequests = await Promise.all(
        eventList.map(async (ev: { id: number; title: string; slug: string; start_date: string; status: string }) => {
          try {
            const reqRes = await fetch(
              `/api/events/${ev.id}/service-requests`,
              { credentials: 'include' }
            );
            if (!reqRes.ok) return { ...ev, service_requests: [] };
            const reqData = await reqRes.json();
            return { ...ev, service_requests: reqData?.data?.service_requests || [] };
          } catch {
            return { ...ev, service_requests: [] };
          }
        })
      );

      setEvents(eventsWithRequests);
    } catch {
      // Silently fail — error state not needed for this manager
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNewRequest = (event: EventWithServiceRequests) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleRequestCreated = () => {
    fetchData();
  };

  const handlePublish = async (event: EventWithServiceRequests, request: EventServiceRequest) => {
    if (!confirm(`Publish "${request.title}" to open it for vendor bids? This will create a Quote in the Quote System.`)) return;
    setProcessingId(request.id);
    try {
      const res = await fetchWithCsrf(
        `/api/events/${event.id}/service-requests/${request.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'open' }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error ?? 'Failed to publish service request');
        return;
      }
      fetchData();
    } catch {
      alert('Failed to publish service request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (event: EventWithServiceRequests, request: EventServiceRequest) => {
    if (!confirm(`Cancel "${request.title}"? This cannot be undone.`)) return;
    setProcessingId(request.id);
    try {
      await fetchWithCsrf(
        `/api/events/${event.id}/service-requests/${request.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );
      fetchData();
    } catch {
      alert('Failed to cancel service request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (event: EventWithServiceRequests, request: EventServiceRequest) => {
    if (!confirm(`Delete "${request.title}"? This will permanently remove the service request.`)) return;
    setProcessingId(request.id);
    try {
      await fetchWithCsrf(
        `/api/events/${event.id}/service-requests/${request.id}`,
        { method: 'DELETE' }
      );
      fetchData();
    } catch {
      alert('Failed to delete service request. Please try again.');
    } finally {
      setProcessingId(null);
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
        <span className="ml-2 text-gray-500">Loading events and service requests...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to manage service procurement.</p>
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
              onClick={() => handleNewRequest(event)}
              className="flex items-center gap-1.5 px-3 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>

          {/* Service request list */}
          {event.service_requests.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">
              No service requests yet. Create a request to procure catering, AV, security, or other services for this event.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {event.service_requests.map((req) => (
                <div key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: request info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${categoryColors[req.service_category] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {categoryLabels[req.service_category] || req.service_category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityColors[req.priority] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {req.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[req.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="font-medium text-gray-900 text-sm">{req.title}</p>

                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                        {(req.budget_min != null || req.budget_max != null) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatBudget(req.budget_min, req.budget_max)}
                          </span>
                        )}
                        {req.required_by_date && (
                          <span>Needed by: {formatDate(req.required_by_date)}</span>
                        )}
                        {req.quote_id && req.quote_response_count != null && req.quote_response_count > 0 && (
                          <span className="text-biz-orange font-medium">
                            {req.quote_response_count} bid{req.quote_response_count !== 1 ? 's' : ''} received
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* View Bids — only if quote exists */}
                      {req.quote_id && (
                        <a
                          href={`/dashboard/quotes?quoteId=${req.quote_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-biz-orange border border-biz-orange rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Bids
                        </a>
                      )}

                      {/* Publish — only for draft */}
                      {req.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(event, req)}
                          disabled={processingId === req.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="Publish to Quote System"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Publish
                        </button>
                      )}

                      {/* Cancel — for draft or open */}
                      {(req.status === 'draft' || req.status === 'open') && (
                        <button
                          onClick={() => handleCancel(event, req)}
                          disabled={processingId === req.id}
                          className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50"
                          title="Cancel request"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-xs">Cancel</span>
                          )}
                        </button>
                      )}

                      {/* Delete — for draft or cancelled only */}
                      {(req.status === 'draft' || req.status === 'cancelled') && (
                        <button
                          onClick={() => handleDelete(event, req)}
                          disabled={processingId === req.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete request"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {selectedEvent && (
        <EventServiceRequestModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEvent(null);
          }}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          eventStartDate={selectedEvent.start_date}
          onRequestCreated={handleRequestCreated}
        />
      )}
    </div>
  );
}

export function EventServiceRequestManager(props: EventServiceRequestManagerProps) {
  return (
    <ErrorBoundary>
      <EventServiceRequestManagerContent {...props} />
    </ErrorBoundary>
  );
}
