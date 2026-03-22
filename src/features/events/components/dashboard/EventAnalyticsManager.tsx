/**
 * EventAnalyticsManager - Dashboard Analytics Container for Event Owners
 *
 * @tier ADVANCED
 * @phase Phase 4 - Event Owner Analytics Dashboard
 *   Phase 6D - Organizer Analytics Tab (extended)
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * GOVERNANCE RULES:
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use useEventAnalyticsData hook
 * - MUST use orange theme (#ed6437)
 * - MUST use credentials: 'include' on all fetches
 * - No date range filtering (event analytics is all-time)
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useEventAnalyticsData } from '@features/events/hooks/useEventAnalyticsData';
import { EventAnalyticsSummaryCards } from './analytics/EventAnalyticsSummaryCards';
import { EventAnalyticsFunnelChart } from './analytics/EventAnalyticsFunnelChart';
import { EventSharesChart } from './analytics/EventSharesChart';
import { OrganizerAnalyticsSummaryCards } from './analytics/OrganizerAnalyticsSummaryCards';
import { OrganizerAnalyticsBreakdown } from './analytics/OrganizerAnalyticsBreakdown';
import { OrganizerOnboardingModal } from '@features/events/components/OrganizerOnboardingModal';
import { AlertCircle, Loader2, Download, BarChart3, HelpCircle } from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export/fileDownload';
import type { OrganizerAnalyticsData } from '@features/events/types';

// ============================================================================
// TYPES
// ============================================================================

interface EventBasic {
  id: number;
  title: string;
  start_date: string;
  status: string;
  listing_id?: number;
}

interface EventAnalyticsManagerProps {
  listingId: string;
  /** Optional pre-selected event ID (from URL searchParams) */
  eventId?: number | null;
  /** Listing tier for onboarding modal tier-gating */
  tier?: string;
}

type AnalyticsTab = 'event' | 'organizer';

// ============================================================================
// INNER CONTENT: Event Analytics (receives resolved eventId)
// ============================================================================

interface AnalyticsContentProps {
  eventId: number;
  eventTitle: string;
}

function AnalyticsContent({ eventId, eventTitle }: AnalyticsContentProps) {
  const { analytics, isLoading, error } = useEventAnalyticsData(eventId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No analytics data available for this event</p>
      </div>
    );
  }

  // Build CSV export
  const handleExportCSV = () => {
    const rows: string[] = [];

    // Header
    rows.push('Event Analytics Report');
    rows.push(`Event: ${eventTitle}`);
    rows.push(`Generated: ${new Date().toLocaleString()}`);
    rows.push('');

    // Summary metrics
    rows.push('SUMMARY METRICS');
    rows.push('Metric,Value');
    rows.push(`Impressions,${analytics.funnel.impressions}`);
    rows.push(`Page Views,${analytics.funnel.page_views}`);
    rows.push(`Saves,${analytics.funnel.saves}`);
    rows.push(`Shares,${analytics.funnel.shares}`);
    rows.push(`RSVPs,${analytics.funnel.rsvps}`);
    rows.push(`Referrals,${analytics.referrals}`);
    rows.push('');

    // Conversion rates
    rows.push('CONVERSION RATES');
    rows.push('Rate,Value');
    rows.push(`View Rate,${analytics.funnel.conversion_rates.view_rate.toFixed(2)}%`);
    rows.push(`Save Rate,${analytics.funnel.conversion_rates.save_rate.toFixed(2)}%`);
    rows.push(`RSVP Rate,${analytics.funnel.conversion_rates.rsvp_rate.toFixed(2)}%`);
    rows.push('');

    // Share breakdown
    rows.push('SHARE BREAKDOWN BY PLATFORM');
    rows.push('Platform,Shares,Clicks,CTR');
    analytics.shares.forEach(s => {
      rows.push(`${s.platform},${s.shares},${s.clicks},${(s.clickRate * 100).toFixed(1)}%`);
    });

    const csvContent = '\uFEFF' + rows.join('\r\n'); // UTF-8 BOM for Excel
    const filename = generateTimestampedFilename('event-analytics', 'csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <EventAnalyticsSummaryCards
        funnel={analytics.funnel}
        referrals={analytics.referrals}
      />

      {/* Funnel Chart (full width) */}
      <EventAnalyticsFunnelChart funnel={analytics.funnel} />

      {/* Shares Chart */}
      <EventSharesChart shares={analytics.shares} />
    </div>
  );
}

// ============================================================================
// INNER CONTENT: Organizer Analytics
// ============================================================================

interface OrganizerAnalyticsContentProps {
  eventId: number;
}

function OrganizerAnalyticsContent({ eventId }: OrganizerAnalyticsContentProps) {
  const [analytics, setAnalytics] = useState<OrganizerAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/events/${eventId}/analytics/organizer`, {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!res.ok) {
          setError('Failed to load organizer analytics');
          return;
        }
        const data = await res.json();
        setAnalytics(data?.data?.organizer_analytics ?? null);
      } catch {
        if (!cancelled) setError('Failed to load organizer analytics');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchAnalytics();
    return () => { cancelled = true; };
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Organizer Analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No organizer analytics data available for this event</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrganizerAnalyticsSummaryCards analytics={analytics} />
      <OrganizerAnalyticsBreakdown analytics={analytics} />
    </div>
  );
}

// ============================================================================
// MAIN MANAGER (with event selector)
// ============================================================================

function EventAnalyticsManagerContent({ listingId, eventId: initialEventId, tier = 'essentials' }: EventAnalyticsManagerProps) {
  const listingIdNum = parseInt(listingId);

  const [events, setEvents] = useState<EventBasic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialEventId ?? null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('event');
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      // Standard list envelope: data.data.data (items array)
      const eventList: EventBasic[] = data?.data?.data || [];
      const validList = Array.isArray(eventList) ? eventList : [];
      setEvents(validList);

      // Auto-select first event if none pre-selected
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

  // Loading events list
  if (isLoadingEvents) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#ed6437' }} />
      </div>
    );
  }

  // Error loading events list
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

  // No events state
  if (events.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to view analytics.</p>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

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
        <label htmlFor="event-analytics-selector" className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          id="event-analytics-selector"
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

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('event')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'event'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Event Analytics
          </button>
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab('organizer')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'organizer'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Organizer Metrics
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              title="Organizer Guide"
              className="p-1.5 mr-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-orange-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'event' && selectedEventId && selectedEvent && (
        <AnalyticsContent
          key={selectedEventId}
          eventId={selectedEventId}
          eventTitle={selectedEvent.title}
        />
      )}

      {activeTab === 'organizer' && selectedEventId && (
        <OrganizerAnalyticsContent
          key={`organizer-${selectedEventId}`}
          eventId={selectedEventId}
        />
      )}

      {/* Organizer Onboarding Modal */}
      {selectedEventId && (
        <OrganizerOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          eventId={selectedEventId}
          listingId={listingIdNum}
          tier={tier}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT WITH ERRORBOUNDARY (ADVANCED TIER REQUIREMENT)
// ============================================================================

export function EventAnalyticsManager(props: EventAnalyticsManagerProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-900 font-semibold">Something went wrong loading event analytics</p>
        </div>
      }
    >
      <EventAnalyticsManagerContent {...props} />
    </ErrorBoundary>
  );
}

export default EventAnalyticsManager;
