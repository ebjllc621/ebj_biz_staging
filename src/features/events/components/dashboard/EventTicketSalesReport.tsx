/**
 * EventTicketSalesReport - Ticket Sales Revenue Dashboard for Event Organizers
 *
 * Follows EventAnalyticsManager canon: event selector dropdown + content area
 * with revenue summary cards, per-tier breakdown, and CSV export.
 *
 * @tier ADVANCED
 * @phase Phase 5B - Native Ticketing (Revenue Reporting)
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_5B_PLAN.md
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  Loader2,
  AlertCircle,
  DollarSign,
  Ticket,
  RefreshCw,
  Download,
  BarChart3,
} from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export/fileDownload';
import type { EventRevenue, AdminTicketSale } from '@features/events/types';

// ============================================================================
// TYPES
// ============================================================================

interface EventBasic {
  id: number;
  title: string;
  start_date: string;
  status: string;
}

interface EventTicketSalesReportProps {
  listingId: string;
  eventId?: number | null;
}

// ============================================================================
// REVENUE CONTENT (receives resolved eventId)
// ============================================================================

interface RevenueContentProps {
  eventId: number;
  eventTitle: string;
}

function RevenueContent({ eventId, eventTitle }: RevenueContentProps) {
  const [revenue, setRevenue] = useState<EventRevenue | null>(null);
  const [sales, setSales] = useState<AdminTicketSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/events/${eventId}/revenue`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load revenue data');
      }
      const data = await res.json();
      setRevenue(data.revenue);
      setSales(data.sales?.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

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
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Revenue</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No revenue data available for this event</p>
      </div>
    );
  }

  // CSV export
  const handleExportCSV = () => {
    const rows: string[] = [];
    rows.push('Ticket Sales Report');
    rows.push(`Event: ${eventTitle}`);
    rows.push(`Generated: ${new Date().toLocaleString()}`);
    rows.push('');
    rows.push('REVENUE SUMMARY');
    rows.push('Metric,Value');
    rows.push(`Total Revenue,$${revenue.total_revenue.toFixed(2)}`);
    rows.push(`Tickets Sold,${revenue.total_tickets_sold}`);
    rows.push(`Total Purchases,${revenue.total_purchases}`);
    rows.push(`Refunds Processed,${revenue.total_refunds}`);
    rows.push(`Refund Amount,$${revenue.total_refund_amount.toFixed(2)}`);
    rows.push('');

    if (revenue.by_tier.length > 0) {
      rows.push('PER-TIER BREAKDOWN');
      rows.push('Tier,Price,Sold,Total,Revenue,Availability %');
      revenue.by_tier.forEach((t) => {
        const avail = t.quantity_total > 0
          ? (((t.quantity_total - t.quantity_sold) / t.quantity_total) * 100).toFixed(1)
          : 'N/A';
        rows.push(`${t.ticket_name},$${t.ticket_price.toFixed(2)},${t.tickets_sold},${t.quantity_total},$${t.revenue.toFixed(2)},${avail}%`);
      });
      rows.push('');
    }

    if (sales.length > 0) {
      rows.push('RECENT PURCHASES');
      rows.push('Buyer,Tier,Qty,Amount,Status,Date');
      sales.forEach((s) => {
        rows.push(`${s.buyer_name},${s.ticket_name},${s.quantity},$${s.total_amount.toFixed(2)},${s.payment_status},${new Date(s.created_at).toLocaleDateString()}`);
      });
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const filename = generateTimestampedFilename('ticket-sales', 'csv');
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

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-500 uppercase">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${revenue.total_revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-4 h-4" style={{ color: '#ed6437' }} />
            <span className="text-xs font-medium text-gray-500 uppercase">Tickets Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{revenue.total_tickets_sold}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Refunds</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{revenue.total_refunds}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Refund Amount</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${revenue.total_refund_amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Per-Tier Breakdown */}
      {revenue.by_tier.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Tier Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-5 py-2 font-medium">Tier Name</th>
                  <th className="px-5 py-2 font-medium">Price</th>
                  <th className="px-5 py-2 font-medium">Sold / Total</th>
                  <th className="px-5 py-2 font-medium">Revenue</th>
                  <th className="px-5 py-2 font-medium">Availability</th>
                </tr>
              </thead>
              <tbody>
                {revenue.by_tier.map((t, i) => {
                  const availability = t.quantity_total > 0
                    ? ((t.quantity_total - t.quantity_sold) / t.quantity_total) * 100
                    : 0;
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium text-gray-900">{t.ticket_name}</td>
                      <td className="px-5 py-3">${t.ticket_price.toFixed(2)}</td>
                      <td className="px-5 py-3">{t.tickets_sold} / {t.quantity_total}</td>
                      <td className="px-5 py-3 font-medium text-green-700">${t.revenue.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${availability}%`,
                                backgroundColor: availability > 20 ? '#22c55e' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{availability.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Purchases Table */}
      {sales.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Recent Purchases</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-5 py-2 font-medium">Buyer</th>
                  <th className="px-5 py-2 font-medium">Tier</th>
                  <th className="px-5 py-2 font-medium">Qty</th>
                  <th className="px-5 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-5 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{s.buyer_name}</div>
                        <div className="text-xs text-gray-500">{s.buyer_email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3">{s.ticket_name}</td>
                    <td className="px-5 py-3">{s.quantity}</td>
                    <td className="px-5 py-3 font-medium">${s.total_amount.toFixed(2)}</td>
                    <td className="px-5 py-3 text-gray-600">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                        s.payment_status === 'refunded' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {s.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN MANAGER (with event selector — follows EventAnalyticsManager canon)
// ============================================================================

function EventTicketSalesReportContent({ listingId, eventId: initialEventId }: EventTicketSalesReportProps) {
  const listingIdNum = parseInt(listingId);

  const [events, setEvents] = useState<EventBasic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialEventId ?? null);
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
      // Filter to only ticketed events
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
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Events Found</h3>
        <p className="text-gray-500">Create a ticketed event to see sales data here.</p>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="flex items-center gap-4">
        <label htmlFor="event-selector" className="text-sm font-medium text-gray-700">
          Select Event:
        </label>
        <select
          id="event-selector"
          value={selectedEventId ?? ''}
          onChange={(e) => setSelectedEventId(parseInt(e.target.value))}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
        >
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({new Date(ev.start_date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {/* Revenue Content */}
      {selectedEventId && selectedEvent && (
        <RevenueContent eventId={selectedEventId} eventTitle={selectedEvent.title} />
      )}
    </div>
  );
}

export default function EventTicketSalesReport(props: EventTicketSalesReportProps) {
  return (
    <ErrorBoundary componentName="EventTicketSalesReport">
      <EventTicketSalesReportContent {...props} />
    </ErrorBoundary>
  );
}
