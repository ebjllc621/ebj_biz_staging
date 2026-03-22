/**
 * SidebarHoursCard - Full Week Business Hours Display for Sidebar
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase R3.1 - Sidebar Hours Enhancement
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Full 7-day schedule display (matching main content hours)
 * - Current day highlighting with "(Today)" label
 * - "Open Now" / "Closed" status badge
 * - "Opens at..." / "Open until..." / "Closes in..." messaging
 * - Compact sidebar-friendly layout
 * - Returns null if hours_status is 'closed' or no hours data
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_R3_BRAIN_PLAN.md
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Listing, BusinessHour } from '@core/services/ListingService';

interface SidebarHoursCardProps {
  /** Listing data */
  listing: Listing;
}

// Day display order matching main content hours component
const DAYS_ORDER = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

/**
 * Format time from 24h to 12h format
 */
function formatTime(time: string | undefined): string {
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
 * Format minutes into human-readable duration
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours}hr ${mins}min`;
}

/**
 * Normalize business_hours to array format
 * Handles multiple legacy DB formats:
 * - [{day, open: "09:00", close: "17:00"}] (canonical)
 * - [{day, open: true/false, startTime, endTime}] (legacy boolean)
 * - [{day, open: "closed", close: "closed"}] (legacy string-closed)
 * - [{day, isOpen, openTime, closeTime}] (modal schedule format)
 * - {schedule: [...]} (wrapper object)
 * - {monday: {openTime, closeTime}} (object-keyed format)
 */
function normalizeHours(businessHours: unknown): BusinessHour[] | null {
  if (!businessHours) return null;

  let entries: unknown[] | null = null;

  // Handle wrapper object: { schedule: [...] }
  if (typeof businessHours === 'object' && !Array.isArray(businessHours)) {
    const obj = businessHours as Record<string, unknown>;
    if (Array.isArray(obj.schedule)) {
      entries = obj.schedule;
    } else {
      // Object format: { monday: { openTime, closeTime }, ... }
      const result: BusinessHour[] = [];
      for (const [day, times] of Object.entries(obj)) {
        if (times && typeof times === 'object') {
          const t = times as Record<string, string>;
          if (t.openTime && t.closeTime) {
            result.push({ day: day.toLowerCase(), open: t.openTime, close: t.closeTime });
          }
        }
      }
      return result.length > 0 ? result : null;
    }
  }

  if (Array.isArray(businessHours)) {
    entries = businessHours;
  }

  if (!entries || entries.length === 0) return null;

  const result: BusinessHour[] = [];

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
        open: isClosed ? null as unknown as string : e.open as string,
        close: isClosed ? null as unknown as string : e.close as string,
      });
      continue;
    }

    // Format 2: { day, isOpen, openTime, closeTime } (modal schedule)
    if ('isOpen' in e && 'openTime' in e) {
      result.push({
        day,
        open: e.isOpen ? (e.openTime as string) : null as unknown as string,
        close: e.isOpen ? (e.closeTime as string) : null as unknown as string,
      });
      continue;
    }

    // Format 3: { day, open: true/false, startTime, endTime } (legacy boolean)
    if (typeof e.open === 'boolean') {
      result.push({
        day,
        open: e.open ? ((e.startTime as string) || (e.open_time as string) || null as unknown as string) : null as unknown as string,
        close: e.open ? ((e.endTime as string) || (e.close_time as string) || null as unknown as string) : null as unknown as string,
      });
      continue;
    }

    result.push({ day, open: null as unknown as string, close: null as unknown as string });
  }

  return result.length > 0 ? result : null;
}

/**
 * Check if business is currently open and provide detailed status message
 */
function getOpenStatus(hours: BusinessHour[] | null): { isOpen: boolean; message: string } {
  if (!hours || hours.length === 0) {
    return { isOpen: false, message: 'Hours not available' };
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const todayHours = hours.find(h => h.day.toLowerCase() === currentDay);

  if (!todayHours || !todayHours.open || !todayHours.close) {
    // Find next open day
    const dayIndex = DAYS_ORDER.findIndex(d => d.key === currentDay);
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (dayIndex + i) % 7;
      const nextDayKey = DAYS_ORDER[nextDayIndex]?.key;
      if (!nextDayKey) continue;

      const nextDayHours = hours.find(h => h.day.toLowerCase() === nextDayKey);
      if (nextDayHours?.open) {
        const dayLabel = DAYS_ORDER[nextDayIndex]?.label || nextDayKey;
        return {
          isOpen: false,
          message: i === 1 ? `Opens tomorrow` : `Opens ${dayLabel}`
        };
      }
    }
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
    const minutesUntilClose = closeTime - currentTime;
    // Show "Closes in..." for last 2 hours, otherwise "Open until..."
    if (minutesUntilClose <= 120) {
      return { isOpen: true, message: `Closes in ${formatDuration(minutesUntilClose)}` };
    }
    return { isOpen: true, message: `Open until ${formatTime(todayHours.close)}` };
  }

  if (currentTime < openTime) {
    const minutesUntilOpen = openTime - currentTime;
    // Show "Opens in..." for within next 2 hours
    if (minutesUntilOpen <= 120) {
      return { isOpen: false, message: `Opens in ${formatDuration(minutesUntilOpen)}` };
    }
    return { isOpen: false, message: `Opens at ${formatTime(todayHours.open)}` };
  }

  return { isOpen: false, message: 'Closed for today' };
}

export function SidebarHoursCard({ listing }: SidebarHoursCardProps) {
  // Type-safe hours status field
  const hoursStatus = (listing as { hours_status?: string }).hours_status;

  // Force re-render every minute to keep status current
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Normalize hours to array format
  const hours = useMemo(() => {
    // Handle special statuses
    if (hoursStatus === '24-7') {
      // Generate 24/7 hours for all days
      return DAYS_ORDER.map(d => ({
        day: d.key,
        open: '00:00',
        close: '23:59'
      }));
    }
    return normalizeHours(listing.business_hours);
  }, [listing.business_hours, hoursStatus]);

  // Calculate current open status
  const openStatus = useMemo(() => {
    if (hoursStatus === '24-7') {
      return { isOpen: true, message: 'Open 24/7' };
    }
    if (hoursStatus === 'closed') {
      return { isOpen: false, message: 'Permanently closed' };
    }
    return getOpenStatus(hours);
  }, [hours, hoursStatus]);

  // Get current day for highlighting
  const currentDayKey = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase();

  // Return null if explicitly closed or no hours data
  if (hoursStatus === 'closed' || (!hours && !hoursStatus)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4">
      {/* Header with Open/Closed Status */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-biz-orange" />
          Business Hours
        </h4>

        {/* Open/Closed Badge */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          openStatus.isOpen
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {openStatus.isOpen ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          {openStatus.message}
        </div>
      </div>

      {/* Full Week Hours List */}
      <div className="space-y-1">
        {DAYS_ORDER.map(({ key, label }) => {
          const dayHours = hours?.find(h => h.day.toLowerCase() === key);
          const isToday = key === currentDayKey;
          const isClosed = !dayHours || !dayHours.open || !dayHours.close;

          return (
            <div
              key={key}
              className={`flex justify-between items-center py-1.5 px-2 rounded ${
                isToday ? 'bg-biz-orange/10' : ''
              }`}
            >
              <span className={`text-xs ${isToday ? 'text-biz-orange font-medium' : 'text-gray-700'}`}>
                {label}
                {isToday && (
                  <span className="ml-1 text-[10px] text-biz-orange">(Today)</span>
                )}
              </span>

              <span className={`text-xs ${
                isClosed
                  ? 'text-gray-400'
                  : isToday
                    ? 'text-biz-orange font-medium'
                    : 'text-gray-600'
              }`}>
                {hoursStatus === '24-7' ? (
                  '24 Hours'
                ) : isClosed ? (
                  'Closed'
                ) : (
                  `${formatTime(dayHours?.open)} - ${formatTime(dayHours?.close)}`
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SidebarHoursCard;
