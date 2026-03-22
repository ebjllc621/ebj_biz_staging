/**
 * EventCheckInManager - Dashboard Check-In Container for Event Owners
 *
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @authority docs/pages/layouts/integrationPointRef/events/MASTER_INDEX_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use event selector pattern (same as EventAnalyticsManager)
 * - MUST use credentials: 'include' on all fetches
 * - MUST compose EventCheckInQR + ManualCheckInPanel
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventCheckInQR } from '@features/events/components/EventCheckInQR';
import { ManualCheckInPanel } from './ManualCheckInPanel';
import { AlertCircle, Loader2, CalendarCheck, QrCode, ClipboardList } from 'lucide-react';
import type { AttendeeDetail } from '@features/events/types';

// ============================================================================
// TYPES
// ============================================================================

interface EventBasic {
  id: number;
  title: string;
  start_date: string;
  status: string;
}

interface EventCheckInManagerProps {
  listingId: string;
}

type CheckInTab = 'qr' | 'manual';

// ============================================================================
// CHECK-IN CONTENT (receives resolved eventId)
// ============================================================================

interface CheckInContentProps {
  eventId: number;
}

function CheckInContent({ eventId }: CheckInContentProps) {
  const [activeTab, setActiveTab] = useState<CheckInTab>('qr');
  const [attendees, setAttendees] = useState<AttendeeDetail[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(true);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);

  const fetchAttendees = useCallback(async () => {
    setIsLoadingAttendees(true);
    setAttendeesError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendees?limit=200`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setAttendeesError('Failed to load attendees');
        return;
      }
      const data = await res.json();
      const list = data?.data?.items || data?.data?.data || [];
      setAttendees(Array.isArray(list) ? list : []);
    } catch {
      setAttendeesError('Failed to load attendees');
    } finally {
      setIsLoadingAttendees(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchAttendees();
  }, [fetchAttendees]);

  const handleCheckIn = useCallback(() => {
    void fetchAttendees();
  }, [fetchAttendees]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'qr'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR Check-In
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Manual Check-In
          </button>
        </div>
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex flex-col items-center">
            <EventCheckInQR eventId={eventId} size={220} showDetails />
            <p className="text-sm text-gray-500 mt-4 text-center max-w-md">
              Display this QR code at your event entrance. Attendees can scan it to check in automatically.
            </p>
          </div>
        </div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {isLoadingAttendees ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
            </div>
          ) : attendeesError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-900">Failed to Load Attendees</h3>
                  <p className="text-sm text-red-700 mt-1">{attendeesError}</p>
                </div>
              </div>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No attendees registered</p>
              <p className="text-gray-400 text-sm mt-1">Attendees will appear here once they register for this event.</p>
            </div>
          ) : (
            <ManualCheckInPanel
              eventId={eventId}
              attendees={attendees}
              onCheckIn={handleCheckIn}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN MANAGER (with event selector)
// ============================================================================

function EventCheckInManagerContent({ listingId }: EventCheckInManagerProps) {
  const listingIdNum = parseInt(listingId);
  const [events, setEvents] = useState<EventBasic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError(null);
    try {
      const res = await fetch(
        `/api/events?listingId=${listingIdNum}&limit=50`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        setEventsError('Failed to load events');
        return;
      }
      const data = await res.json();
      const eventList: EventBasic[] = data?.data?.data || [];
      const validList = Array.isArray(eventList) ? eventList : [];
      setEvents(validList);

      if (!selectedEventId && validList.length > 0) {
        setSelectedEventId(validList[0]!.id);
      }
    } catch {
      setEventsError('Failed to load events');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [listingIdNum, selectedEventId]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  if (isLoadingEvents) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
      </div>
    );
  }

  if (eventsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Events</h3>
            <p className="text-sm text-red-700 mt-1">{eventsError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to use the check-in system.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label htmlFor="event-checkin-selector" className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          id="event-checkin-selector"
          value={selectedEventId ?? ''}
          onChange={(e) => setSelectedEventId(parseInt(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.title} — {formatDate(event.start_date)}
            </option>
          ))}
        </select>
      </div>

      {/* Check-In Content */}
      {selectedEventId && (
        <CheckInContent key={selectedEventId} eventId={selectedEventId} />
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (with ErrorBoundary)
// ============================================================================

export function EventCheckInManager(props: EventCheckInManagerProps) {
  return (
    <ErrorBoundary>
      <EventCheckInManagerContent {...props} />
    </ErrorBoundary>
  );
}
