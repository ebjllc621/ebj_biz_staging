/**
 * AvailabilityCalendar - Availability Booking Calendar
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Sidebar Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Month view calendar with date grid
 * - Available dates highlighted in green
 * - Unavailable dates grayed out
 * - Next/Previous month navigation
 * - "Book Now" button (opens quote modal)
 * - Tier-gated (Plus, Preferred, Premium only)
 * - Min booking notice enforcement
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_6_BRAIN_PLAN.md
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface AvailabilityCalendarProps {
  /** Listing data */
  listing: Listing;
}

/**
 * Generate calendar days for a given month
 */
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }

  // Next month padding
  const remainingDays = 35 - days.length; // 5 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }

  return days;
}

/**
 * Check if date is available
 */
function isDateAvailable(
  date: Date,
  availabilityCalendar: Record<string, boolean> | undefined,
  minBookingNotice: number = 24, // hours
  maxBookingAdvance: number = 90 // days
): boolean {
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date();
  const minDate = new Date(now.getTime() + minBookingNotice * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + maxBookingAdvance * 24 * 60 * 60 * 1000);

  // Check if date is within booking window
  if (date < minDate || date > maxDate) {
    return false;
  }

  // Check explicit availability (if calendar provided)
  if (availabilityCalendar && typeof availabilityCalendar === 'object' && dateString) {
    // Safe index access with dateString type guard
    const isAvailable = availabilityCalendar[dateString];
    return isAvailable === true;
  }

  // Default: all future dates available (if no calendar provided)
  return date > minDate;
}

export function AvailabilityCalendar({ listing }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Generate calendar days
  const calendarDays = useMemo(() => generateCalendarDays(year, month), [year, month]);

  // Month display
  const monthDisplay = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
  }, [year, month]);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
  }, [year, month]);

  // Date selection handler
  const handleDateClick = useCallback((date: Date) => {
    // Type-safe field access (these fields not in Listing type yet)
    const availabilityCalendar = (listing as any).availability_calendar as Record<string, boolean> | undefined;
    const minBookingNotice = (listing as any).min_booking_notice as number | undefined;
    const maxBookingAdvance = (listing as any).max_booking_advance as number | undefined;

    const available = isDateAvailable(
      date,
      availabilityCalendar,
      minBookingNotice,
      maxBookingAdvance
    );

    if (available) {
      setSelectedDate(date);
    }
  }, [listing]);

  // Book now handler (will integrate with RequestQuoteButton)
  const handleBookNow = useCallback(() => {
    if (!selectedDate) return;

    // Trigger RequestQuoteButton modal with pre-filled date
    // This will be handled by parent component coordination
    const event = new CustomEvent('openQuoteModal', {
      detail: { selectedDate: selectedDate.toISOString().split('T')[0] }
    });
    window.dispatchEvent(event);
  }, [selectedDate]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-biz-orange" />
          Availability
        </h3>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {monthDisplay}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-gray-500 text-center py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          // Type-safe field access (these fields not in Listing type yet)
          const availabilityCalendar = (listing as any).availability_calendar as Record<string, boolean> | undefined;
          const minBookingNotice = (listing as any).min_booking_notice as number | undefined;
          const maxBookingAdvance = (listing as any).max_booking_advance as number | undefined;

          const isAvailable = day.isCurrentMonth && isDateAvailable(
            day.date,
            availabilityCalendar,
            minBookingNotice,
            maxBookingAdvance
          );
          const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
          const isToday = day.date.toDateString() === new Date().toDateString();

          return (
            <button
              key={index}
              onClick={() => day.isCurrentMonth && handleDateClick(day.date)}
              disabled={!isAvailable}
              className={`
                aspect-square text-xs rounded-md transition-colors
                ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                ${isAvailable ? 'hover:bg-green-100 cursor-pointer' : 'cursor-not-allowed'}
                ${isAvailable ? 'text-gray-900' : 'text-gray-400'}
                ${isSelected ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                ${!isSelected && isAvailable ? 'bg-green-50' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-biz-orange' : ''}
              `}
              aria-label={day.date.toDateString()}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Book Now Button */}
      {selectedDate && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-2 text-center">
            Selected: {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </p>
          <button
            onClick={handleBookNow}
            className="w-full px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors text-sm font-medium"
          >
            Book This Date
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 rounded"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span className="text-gray-600">Unavailable</span>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
