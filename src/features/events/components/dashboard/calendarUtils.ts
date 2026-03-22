/**
 * Calendar Utility Functions
 *
 * Pure date helper functions for calendar grid generation.
 * Uses native Date + Intl.DateTimeFormat APIs exclusively.
 * NO external date library dependencies.
 *
 * @tier SIMPLE
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */

import type { CalendarViewMode, CalendarEvent, CalendarDay } from '@features/events/types';

/**
 * Get all days to display for a month grid.
 * Starts from the Sunday before the 1st of the month,
 * ends on the Saturday after the last day of the month.
 */
export function getMonthDays(year: number, month: number): Date[] {
  // First day of the month (month is 0-indexed)
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Start from the Sunday before (or on) the first day
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  // End on the Saturday after (or on) the last day
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Get the 7 days of the week containing the given date.
 * Week starts on Sunday.
 */
export function getWeekDays(date: Date): Date[] {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Get hours array for day/week view time slots (8am through 10pm).
 */
export function getHourSlots(): number[] {
  const hours: number[] = [];
  for (let h = 8; h <= 22; h++) {
    hours.push(h);
  }
  return hours;
}

/**
 * Format date to YYYY-MM-DD string for keying.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same calendar day (ignores time).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Format date to "March 2026" style string.
 */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date or ISO string to "9:00 AM" style string.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Navigate: get the next or previous month/week/day from the reference date.
 * direction: 1 = forward, -1 = backward
 */
export function navigateDate(date: Date, mode: CalendarViewMode, direction: 1 | -1): Date {
  const result = new Date(date);
  switch (mode) {
    case 'month':
      result.setMonth(result.getMonth() + direction);
      break;
    case 'week':
      result.setDate(result.getDate() + direction * 7);
      break;
    case 'day':
      result.setDate(result.getDate() + direction);
      break;
  }
  return result;
}

/**
 * Get the visible date range (start and end) for a given view mode and reference date.
 * Used to determine what date range to fetch from the API.
 */
export function getVisibleRange(date: Date, mode: CalendarViewMode): { start: Date; end: Date } {
  switch (mode) {
    case 'month': {
      const days = getMonthDays(date.getFullYear(), date.getMonth());
      // days is always non-empty (getMonthDays returns at least 28 days)
      return { start: days[0]!, end: days[days.length - 1]! };
    }
    case 'week': {
      const days = getWeekDays(date);
      // days is always exactly 7 elements
      return { start: days[0]!, end: days[days.length - 1]! };
    }
    case 'day': {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
}

/**
 * Map events to CalendarDay[] for month grid rendering.
 * Each day gets the events whose start_date falls on that day.
 *
 * @param monthDays - Array of Date objects for the full grid (from getMonthDays)
 * @param events - CalendarEvent[] fetched from the API
 * @param currentMonth - 0-indexed month number for isCurrentMonth check
 */
export function buildCalendarDays(
  monthDays: Date[],
  events: CalendarEvent[],
  currentMonth: number
): CalendarDay[] {
  const today = new Date();

  return monthDays.map((date) => {
    const dateKey = toDateKey(date);
    // Match events by start_date day
    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.start_date);
      return (
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getDate() === date.getDate()
      );
    });

    return {
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === currentMonth,
      isToday: isSameDay(date, today),
      events: dayEvents,
    };
  });
}
