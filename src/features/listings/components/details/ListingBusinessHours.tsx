/**
 * ListingBusinessHours - Business Hours Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3 - Location & Contact
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - 7-day schedule display
 * - Current day highlighting
 * - "Open Now" / "Closed Now" status badge
 * - Handles 24/7 and closed states via hours_status column
 * - Normalizes multiple legacy DB formats
 * - Responsive layout (table on desktop, list on mobile)
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_3_BRAIN_PLAN.md
 */
'use client';

import { useMemo } from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ListingBusinessHoursProps {
  /** Listing data */
  listing: Listing;
}

// Day display order and labels
const DAYS_ORDER = [
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
];

interface NormalizedHour {
  day: string;
  open: string | null;
  close: string | null;
}

/**
 * Normalize business_hours from any legacy DB format to consistent array
 * Handles:
 * - [{day, open: "09:00", close: "17:00"}] (canonical)
 * - [{day, open: true, startTime, endTime}] (legacy boolean)
 * - [{day, open: "closed", close: "closed"}] (legacy string-closed)
 * - [{day, isOpen, openTime, closeTime}] (modal schedule format)
 * - {schedule: [...]} (wrapper object)
 */
function normalizeHours(raw: unknown): NormalizedHour[] | null {
  if (!raw) return null;

  let entries: unknown[] | null = null;

  // Handle wrapper object: { schedule: [...] }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.schedule)) {
      entries = obj.schedule;
    } else {
      return null;
    }
  }

  if (Array.isArray(raw)) {
    entries = raw;
  }

  if (!entries || entries.length === 0) return null;

  const result: NormalizedHour[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const day = (e.day as string)?.toLowerCase();
    if (!day) continue;

    // Format 1: { day, open: "09:00", close: "17:00" } (canonical)
    if (typeof e.open === 'string' && typeof e.close === 'string') {
      const isClosed = e.open === 'closed' || e.close === 'closed' || e.open === '' || e.close === '';
      result.push({
        day,
        open: isClosed ? null : e.open as string,
        close: isClosed ? null : e.close as string,
      });
      continue;
    }

    // Format 2: { day, isOpen, openTime, closeTime } (modal schedule)
    if ('isOpen' in e && 'openTime' in e) {
      result.push({
        day,
        open: e.isOpen ? (e.openTime as string) : null,
        close: e.isOpen ? (e.closeTime as string) : null,
      });
      continue;
    }

    // Format 3: { day, open: true/false, startTime, endTime } (legacy)
    if (typeof e.open === 'boolean') {
      result.push({
        day,
        open: e.open ? ((e.startTime as string) || (e.open_time as string) || null) : null,
        close: e.open ? ((e.endTime as string) || (e.close_time as string) || null) : null,
      });
      continue;
    }

    result.push({ day, open: null, close: null });
  }

  return result.length > 0 ? result : null;
}

/**
 * Format time from 24h to 12h format
 */
function formatTime(time: string | undefined | null): string {
  if (!time) return 'Closed';

  const parts = time.split(':').map(Number);
  if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) return 'Invalid time';

  const hours = parts[0];
  const minutes = parts[1];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if business is currently open
 */
function isCurrentlyOpen(hours: NormalizedHour[] | null): { isOpen: boolean; message: string } {
  if (!hours || hours.length === 0) {
    return { isOpen: false, message: 'Hours not available' };
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = hours.find(h => h.day.toLowerCase() === currentDay);

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return { isOpen: false, message: 'Closed today' };
  }

  const openParts = todayHours.open.split(':').map(Number);
  const closeParts = todayHours.close.split(':').map(Number);

  if (openParts.length < 2 || closeParts.length < 2 ||
      openParts[0] === undefined || openParts[1] === undefined ||
      closeParts[0] === undefined || closeParts[1] === undefined) {
    return { isOpen: false, message: 'Invalid hours' };
  }

  const openTime = openParts[0] * 60 + openParts[1];
  const closeTime = closeParts[0] * 60 + closeParts[1];

  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, message: `Open until ${formatTime(todayHours.close)}` };
  }

  if (currentTime < openTime) {
    return { isOpen: false, message: `Opens at ${formatTime(todayHours.open)}` };
  }

  return { isOpen: false, message: 'Closed for today' };
}

export function ListingBusinessHours({ listing }: ListingBusinessHoursProps) {
  // Read hours_status from the dedicated DB column
  const hoursStatus = (listing as { hours_status?: string }).hours_status;

  // Parse and normalize business hours from any format
  const hours = useMemo(() => normalizeHours(listing.business_hours), [listing.business_hours]);

  // Calculate current open status
  const openStatus = useMemo(() => {
    if (hoursStatus === '24-7') {
      return { isOpen: true, message: 'Open 24/7' };
    }
    if (hoursStatus === 'closed') {
      return { isOpen: false, message: 'Temporarily closed' };
    }
    return isCurrentlyOpen(hours);
  }, [hours, hoursStatus]);

  // Get current day for highlighting
  const currentDayKey = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();

  // If explicitly closed, show closed message
  if (hoursStatus === 'closed') {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
            <Clock className="w-5 h-5 text-biz-orange" />
            Business Hours
          </h2>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            <XCircle className="w-4 h-4" />
            Temporarily closed
          </div>
        </div>
      </section>
    );
  }

  // If 24/7, show 24/7 message
  if (hoursStatus === '24-7') {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
            <Clock className="w-5 h-5 text-biz-orange" />
            Business Hours
          </h2>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-4 h-4" />
            Open 24/7
          </div>
        </div>
      </section>
    );
  }

  // If no hours data and no special status, don't render
  if (!hours || hours.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header with Open/Closed Status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Clock className="w-5 h-5 text-biz-orange" />
          Business Hours
        </h2>

        {/* Open/Closed Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          openStatus.isOpen
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {openStatus.isOpen ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {openStatus.message}
        </div>
      </div>

      {/* Hours Table */}
      <div className="space-y-2">
        {DAYS_ORDER.map(({ key, label }) => {
          const dayHours = hours.find(h => h.day.toLowerCase() === key);
          const isToday = key === currentDayKey;
          const isClosed = !dayHours || !dayHours.open || !dayHours.close;

          return (
            <div
              key={key}
              className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                isToday ? 'bg-biz-orange/10 font-medium' : ''
              }`}
            >
              <span className={`${isToday ? 'text-biz-orange' : 'text-gray-700'}`}>
                {label}
                {isToday && (
                  <span className="ml-2 text-xs text-biz-orange">(Today)</span>
                )}
              </span>

              <span className={`${
                isClosed ? 'text-gray-400' : isToday ? 'text-biz-orange' : 'text-gray-900'
              }`}>
                {isClosed ? (
                  'Closed'
                ) : (
                  `${formatTime(dayHours?.open)} - ${formatTime(dayHours?.close)}`
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ListingBusinessHours;
