/**
 * EventAttendeeManager - Dashboard manager for event attendees, waitlist, and leads
 *
 * Lists all events owned by this listing with RSVP/attendee management.
 * Provides attendee list, waitlist management, lead export, and capacity editing.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3 - Gap G7/G22: RSVP & Attendee Management
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export/fileDownload';
import {
  CalendarDays,
  Users,
  Download,
  Copy,
  UserPlus,
  Loader2,
  AlertCircle,
  ChevronUp,
  QrCode,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import type { AttendeeDetail, EventWaitlistEntry, CheckInStats } from '@features/events/types';
import { EventQRScanner } from '@features/events/components/dashboard/EventQRScanner';
import { ManualCheckInPanel } from '@features/events/components/dashboard/ManualCheckInPanel';
import { AttendeeInviteModal } from '@features/events/components/AttendeeInviteModal';

// ============================================================
// Local Types
// ============================================================

interface EventBasic {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  status: string;
  total_capacity: number | null;
  rsvp_count: number;
  check_in_enabled?: boolean;
}

interface EventAttendeeManagerProps {
  listingId: string;
}

type ActiveTab = 'attendees' | 'waitlist' | 'leads' | 'qr-scanner' | 'manual-checkin' | 'checkin-stats';

// ============================================================
// CSV Helper
// ============================================================

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // RFC 4180: wrap in quotes if value contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============================================================
// Main Component Content
// ============================================================

function EventAttendeeManagerContent({ listingId }: EventAttendeeManagerProps) {
  const listingIdNum = parseInt(listingId);

  const [events, setEvents] = useState<EventBasic[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<AttendeeDetail[]>([]);
  const [waitlist, setWaitlist] = useState<EventWaitlistEntry[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('attendees');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [newCapacity, setNewCapacity] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInStats, setCheckInStats] = useState<CheckInStats | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch event list on mount
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/events?listingId=${listingIdNum}&limit=50`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        setError('Failed to load events');
        return;
      }
      const data = await res.json();
      const eventList: EventBasic[] = data?.data?.data || [];
      setEvents(Array.isArray(eventList) ? eventList : []);
      if (eventList.length > 0 && !selectedEventId) {
        setSelectedEventId(eventList[0]!.id);
      }
    } catch {
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [listingIdNum, selectedEventId]);

  // Fetch attendees and waitlist when selectedEventId changes
  const fetchDetails = useCallback(async (eventId: number) => {
    setIsLoadingDetails(true);
    try {
      const [attendeesRes, waitlistRes, checkInRes] = await Promise.all([
        fetch(`/api/events/${eventId}/attendees`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/waitlist/manage`, { credentials: 'include' }),
        fetch(`/api/events/${eventId}/check-in`, { credentials: 'include' }),
      ]);

      if (attendeesRes.ok) {
        const attendeesData = await attendeesRes.json();
        setAttendees(attendeesData?.data?.attendees || []);
      } else {
        setAttendees([]);
      }

      if (waitlistRes.ok) {
        const waitlistData = await waitlistRes.json();
        setWaitlist(waitlistData?.data?.waitlist || []);
      } else {
        setWaitlist([]);
      }

      if (checkInRes.ok) {
        const checkInData = await checkInRes.json();
        setCheckInStats(checkInData?.data?.stats || null);
      } else {
        setCheckInStats(null);
      }
    } catch {
      setAttendees([]);
      setWaitlist([]);
      setCheckInStats(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchDetails(selectedEventId);
    }
  }, [selectedEventId, fetchDetails]);

  // Handlers
  const handleEventSelect = (eventId: number) => {
    setSelectedEventId(eventId);
    setActiveTab('attendees');
    setSearchTerm('');
    setEditingCapacity(false);
  };

  const handlePromote = async (userId: number) => {
    if (!selectedEventId) return;
    try {
      await fetchWithCsrf(`/api/events/${selectedEventId}/attendees/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchDetails(selectedEventId);
    } catch {
      alert('Failed to promote user. Please try again.');
    }
  };

  const handleSaveCapacity = async () => {
    if (!selectedEventId || newCapacity <= 0) return;
    try {
      await fetchWithCsrf(`/api/events/${selectedEventId}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_capacity: newCapacity }),
      });
      setEditingCapacity(false);
      fetchEvents();
    } catch {
      alert('Failed to update capacity. Please try again.');
    }
  };

  const handleExportCSV = () => {
    // UTF-8 BOM for Excel compatibility
    const bom = '\uFEFF';
    const headers = ['Name', 'Email', 'Status', 'RSVP Date', 'Attended'];
    const rows = attendees.map(a => [
      escapeCSV(a.user_name),
      escapeCSV(a.user_email),
      escapeCSV(a.rsvp_status),
      escapeCSV(new Date(a.rsvp_date).toLocaleDateString()),
      escapeCSV(a.attended ? 'Yes' : 'No'),
    ].join(','));
    const csv = bom + [headers.join(','), ...rows].join('\n');
    downloadFile(csv, generateTimestampedFilename('event-attendees', 'csv'), 'text/csv;charset=utf-8');
  };

  const handleExportLeads = () => {
    const bom = '\uFEFF';
    const headers = ['Name', 'Email', 'RSVP Date'];
    const confirmed = attendees.filter(a => a.rsvp_status === 'confirmed');
    const rows = confirmed.map(a => [
      escapeCSV(a.user_name),
      escapeCSV(a.user_email),
      escapeCSV(new Date(a.rsvp_date).toLocaleDateString()),
    ].join(','));
    const csv = bom + [headers.join(','), ...rows].join('\n');
    downloadFile(csv, generateTimestampedFilename('event-leads', 'csv'), 'text/csv;charset=utf-8');
  };

  const handleCopyEmails = async () => {
    const confirmed = attendees.filter(a => a.rsvp_status === 'confirmed');
    const emails = confirmed.map(a => a.user_email).join(', ');
    await navigator.clipboard.writeText(emails);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Format helpers
  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-700',
  };

  const waitlistStatusColors: Record<string, string> = {
    waiting: 'bg-blue-100 text-blue-700',
    offered: 'bg-purple-100 text-purple-700',
    claimed: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
  };

  // Filtered attendees by search
  const filteredAttendees = attendees.filter(a =>
    a.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const confirmedCount = attendees.filter(a => a.rsvp_status === 'confirmed').length;

  // ============================================================
  // Loading state
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">Loading events...</span>
      </div>
    );
  }

  // ============================================================
  // Error state
  // ============================================================

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  // ============================================================
  // Empty state
  // ============================================================

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No events found</p>
        <p className="text-gray-400 text-sm mt-1">Create events to manage attendees.</p>
      </div>
    );
  }

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Event selector (if multiple events) */}
      {events.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>
          <select
            value={selectedEventId ?? ''}
            onChange={(e) => handleEventSelect(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange"
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} — {formatDate(event.start_date)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected event content */}
      {selectedEvent && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Event header */}
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-biz-navy">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(selectedEvent.start_date)} &middot; {selectedEvent.status}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Attendees
                </button>
                {/* Capacity display */}
                {selectedEvent.total_capacity !== null && (
                  <div className="text-sm text-gray-600 text-right">
                    <div className="font-medium">
                      {selectedEvent.rsvp_count} / {selectedEvent.total_capacity} capacity
                    </div>
                    <div className="mt-1 w-32 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-biz-orange h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, (selectedEvent.rsvp_count / selectedEvent.total_capacity) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex flex-wrap border-b border-gray-200 bg-white">
            {([
              { key: 'attendees', label: `Attendees (${attendees.length})` },
              { key: 'waitlist', label: `Waitlist (${waitlist.length})` },
              { key: 'leads', label: 'Leads' },
              ...(selectedEvent?.check_in_enabled ? [
                { key: 'qr-scanner', label: 'QR Scanner' },
                { key: 'manual-checkin', label: 'Manual Check-In' },
                { key: 'checkin-stats', label: 'Check-In Stats' },
              ] : []),
            ] as { key: ActiveTab; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-biz-orange text-biz-orange'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <>
              {/* Attendees Tab */}
              {activeTab === 'attendees' && (
                <div className="p-5 space-y-4">
                  {/* Controls row */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange"
                    />
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Attendee rows */}
                  {filteredAttendees.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      {attendees.length === 0 ? 'No attendees yet.' : 'No results match your search.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                      {filteredAttendees.map(attendee => (
                        <div key={attendee.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          {/* Avatar */}
                          {attendee.user_avatar ? (
                            <img
                              src={attendee.user_avatar}
                              alt={attendee.user_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-biz-navy text-white flex items-center justify-center text-xs font-semibold">
                              {getInitials(attendee.user_name)}
                            </div>
                          )}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{attendee.user_name}</p>
                            <p className="text-xs text-gray-500 truncate">{attendee.user_email}</p>
                          </div>
                          {/* Status badge */}
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[attendee.rsvp_status] || 'bg-gray-100 text-gray-600'}`}>
                            {attendee.rsvp_status}
                          </span>
                          {/* Date */}
                          <span className="text-xs text-gray-400 hidden sm:block">
                            {formatDate(attendee.rsvp_date)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Capacity section */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Capacity: {selectedEvent.rsvp_count} / {selectedEvent.total_capacity ?? 'Unlimited'}
                      </span>
                      {!editingCapacity ? (
                        <button
                          onClick={() => {
                            setNewCapacity(selectedEvent.total_capacity ?? 0);
                            setEditingCapacity(true);
                          }}
                          className="text-sm text-biz-orange hover:underline font-medium"
                        >
                          Edit Capacity
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={newCapacity}
                            onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-biz-orange"
                          />
                          <button
                            onClick={handleSaveCapacity}
                            className="px-3 py-1 bg-biz-orange text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCapacity(false)}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Waitlist Tab */}
              {activeTab === 'waitlist' && (
                <div className="p-5">
                  {waitlist.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">
                      <ChevronUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No users on the waitlist.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                      {waitlist.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          {/* Position */}
                          <span className="w-6 text-center text-sm font-semibold text-gray-500">
                            {index + 1}
                          </span>
                          {/* Avatar */}
                          {entry.user_avatar ? (
                            <img
                              src={entry.user_avatar}
                              alt={entry.user_name || ''}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold">
                              {entry.user_name ? getInitials(entry.user_name) : '?'}
                            </div>
                          )}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{entry.user_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
                          </div>
                          {/* Status badge */}
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${waitlistStatusColors[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                            {entry.status}
                          </span>
                          {/* Promote button */}
                          {(entry.status === 'waiting' || entry.status === 'offered') && (
                            <button
                              onClick={() => handlePromote(entry.user_id)}
                              className="flex items-center gap-1 px-2 py-1 bg-biz-orange text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                              title="Promote to confirmed RSVP"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Promote
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QR Scanner Tab */}
              {activeTab === 'qr-scanner' && selectedEvent && (
                <div className="p-5">
                  <EventQRScanner
                    eventId={selectedEvent.id}
                    onCheckIn={() => { if (selectedEvent) fetchDetails(selectedEvent.id); }}
                    onError={(err) => console.error('[QRScanner]', err)}
                  />
                </div>
              )}

              {/* Manual Check-In Tab */}
              {activeTab === 'manual-checkin' && selectedEvent && (
                <div className="p-5">
                  <ManualCheckInPanel
                    eventId={selectedEvent.id}
                    attendees={attendees}
                    onCheckIn={() => { if (selectedEvent) fetchDetails(selectedEvent.id); }}
                  />
                </div>
              )}

              {/* Check-In Stats Tab */}
              {activeTab === 'checkin-stats' && (
                <div className="p-5">
                  {checkInStats ? (
                    <div className="space-y-5">
                      {/* Overview cards */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-biz-navy">{checkInStats.totalCheckedIn}</div>
                          <div className="text-xs text-gray-500 mt-1">Checked In</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-biz-navy">{checkInStats.totalRsvps}</div>
                          <div className="text-xs text-gray-500 mt-1">Total RSVPs</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-biz-orange">{checkInStats.checkInRate}%</div>
                          <div className="text-xs text-gray-500 mt-1">Check-In Rate</div>
                        </div>
                      </div>

                      {/* By method breakdown */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">By Check-In Method</h4>
                        <div className="space-y-2">
                          {([
                            { key: 'qr_scan', label: 'QR Scan', icon: QrCode },
                            { key: 'manual', label: 'Manual (organizer)', icon: CheckSquare },
                            { key: 'self', label: 'Self Check-In', icon: BarChart3 },
                          ] as { key: keyof typeof checkInStats.byMethod; label: string; icon: typeof QrCode }[]).map(({ key, label, icon: Icon }) => (
                            <div key={key} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2.5">
                              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-600 flex-1">{label}</span>
                              <span className="text-sm font-semibold text-biz-navy">{checkInStats.byMethod[key]}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {checkInStats.totalRsvps > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Check-In Progress</span>
                            <span>{checkInStats.totalCheckedIn} / {checkInStats.totalRsvps}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-biz-orange h-3 rounded-full transition-all"
                              style={{ width: `${checkInStats.checkInRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-400">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No check-in data available.
                    </div>
                  )}
                </div>
              )}

              {/* Leads Tab */}
              {activeTab === 'leads' && (
                <div className="p-5 space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-biz-navy">{confirmedCount}</span> confirmed attendee{confirmedCount !== 1 ? 's' : ''} with contact info
                    </p>
                  </div>

                  {confirmedCount === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400">
                      No confirmed attendees yet.
                    </div>
                  ) : (
                    <>
                      {/* Email list with copy */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Email Addresses</span>
                          <button
                            onClick={handleCopyEmails}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copyFeedback ? 'Copied!' : 'Copy All'}
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs text-gray-600 max-h-32 overflow-y-auto break-all">
                          {attendees
                            .filter(a => a.rsvp_status === 'confirmed')
                            .map(a => a.user_email)
                            .join(', ')}
                        </div>
                      </div>

                      {/* Export leads button */}
                      <button
                        onClick={handleExportLeads}
                        className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export Leads CSV
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Attendee Invite Modal */}
      {selectedEvent && (
        <AttendeeInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onInvitesSent={() => {
            if (selectedEventId) fetchDetails(selectedEventId);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Exported Component with ErrorBoundary
// ============================================================

export function EventAttendeeManager(props: EventAttendeeManagerProps) {
  return (
    <ErrorBoundary>
      <EventAttendeeManagerContent {...props} />
    </ErrorBoundary>
  );
}
