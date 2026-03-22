/**
 * ManualCheckInPanel - Organizer manual check-in panel
 *
 * Lists all attendees with search and manual check-in button.
 * Shows check-in status with green checkmark and timestamp.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { CheckCircle, Loader2, Search, Users } from 'lucide-react';
import type { AttendeeDetail } from '@features/events/types';

interface ManualCheckInPanelProps {
  eventId: number;
  attendees: AttendeeDetail[];
  onCheckIn: (result: unknown) => void;
}

export function ManualCheckInPanel({ eventId, attendees, onCheckIn }: ManualCheckInPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<number>>(
    () => new Set(attendees.filter(a => a.attended).map(a => a.id))
  );
  const [checkedInAt, setCheckedInAt] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const filteredAttendees = attendees.filter(a =>
    a.rsvp_status === 'confirmed' &&
    (
      a.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleCheckIn = async (attendee: AttendeeDetail) => {
    setCheckingIn(attendee.id);
    setErrors(prev => ({ ...prev, [attendee.id]: '' }));

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvpId: attendee.id,
          method: 'manual',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(prev => ({
          ...prev,
          [attendee.id]: data?.error || 'Check-in failed',
        }));
        return;
      }

      setCheckedInIds(prev => new Set([...prev, attendee.id]));
      setCheckedInAt(prev => ({
        ...prev,
        [attendee.id]: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
      onCheckIn(data?.data);
    } catch {
      setErrors(prev => ({
        ...prev,
        [attendee.id]: 'Network error. Please try again.',
      }));
    } finally {
      setCheckingIn(null);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search attendees by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-biz-orange"
        />
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Users className="w-4 h-4" />
        <span>
          {checkedInIds.size} of {filteredAttendees.length} checked in
        </span>
      </div>

      {/* Attendee list */}
      {filteredAttendees.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          {attendees.filter(a => a.rsvp_status === 'confirmed').length === 0
            ? 'No confirmed attendees yet.'
            : 'No results match your search.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {filteredAttendees.map(attendee => {
            const isCheckedIn = checkedInIds.has(attendee.id);
            const isCheckingInNow = checkingIn === attendee.id;
            const errorMsg = errors[attendee.id];
            const timestamp = checkedInAt[attendee.id];

            return (
              <div
                key={attendee.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isCheckedIn ? 'bg-green-50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar */}
                {attendee.user_avatar ? (
                  <img
                    src={attendee.user_avatar}
                    alt={attendee.user_name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-biz-navy text-white flex items-center justify-center text-xs font-semibold shrink-0">
                    {getInitials(attendee.user_name)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{attendee.user_name}</p>
                  <p className="text-xs text-gray-500 truncate">{attendee.user_email}</p>
                  {errorMsg && (
                    <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>
                  )}
                </div>

                {/* Status / Action */}
                {isCheckedIn ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      {timestamp ? `Checked in ${timestamp}` : 'Checked in'}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckIn(attendee)}
                    disabled={isCheckingInNow}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-biz-orange text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isCheckingInNow ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Checking in...
                      </>
                    ) : (
                      'Check In'
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
