/**
 * EventCalendarView - Dashboard calendar with Day/Week/Month views
 *
 * Custom CSS Grid calendar using native Date + Intl.DateTimeFormat APIs.
 * NO external calendar or date library dependencies.
 *
 * @tier ADVANCED
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { CalendarEvent, CalendarViewMode, CalendarDay, CalendarEventStatus } from '@features/events/types';
import { EventQuickView } from './EventQuickView';
import {
  getMonthDays,
  getWeekDays,
  getHourSlots,
  toDateKey,
  isSameDay,
  isToday,
  formatMonthYear,
  formatTime,
  navigateDate,
  getVisibleRange,
  buildCalendarDays,
} from './calendarUtils';

// ============================================================================
// Constants
// ============================================================================

const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const STATUS_PILL_CLASSES: Record<CalendarEventStatus, string> = {
  going: 'bg-green-100 text-green-800 border-green-300',
  saved: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  created: 'bg-blue-100 text-blue-800 border-blue-300',
  past: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_DOT_CLASSES: Record<CalendarEventStatus, string> = {
  going: 'bg-green-500',
  saved: 'bg-yellow-400',
  created: 'bg-blue-500',
  past: 'bg-gray-400',
};

function getEffectiveStatus(event: CalendarEvent): CalendarEventStatus {
  if (new Date(event.end_date) < new Date()) return 'past';
  return event.calendar_status;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, colIdx) => (
            <div key={colIdx} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Month View
// ============================================================================

interface MonthViewProps {
  currentDate: Date;
  calendarDays: CalendarDay[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

function MonthView({ currentDate, calendarDays, onEventClick }: MonthViewProps) {
  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES_SHORT.map((name, i) => (
          <div key={i} className="hidden sm:block text-center text-xs font-medium text-gray-500 py-2">
            {name}
          </div>
        ))}
        {DAY_NAMES_ABBR.map((name, i) => (
          <div key={i} className="sm:hidden text-center text-xs font-medium text-gray-500 py-2">
            {name}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {calendarDays.map((day) => (
          <div
            key={day.dateKey}
            className={`min-h-[80px] sm:min-h-[100px] bg-white p-1 ${
              !day.isCurrentMonth ? 'opacity-40' : ''
            } ${day.isToday ? 'bg-blue-50' : ''}`}
          >
            {/* Day number */}
            <div className="flex justify-end mb-1">
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  day.isToday
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700'
                }`}
              >
                {day.date.getDate()}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-0.5">
              {/* Desktop: pill labels */}
              {day.events.slice(0, 3).map((event) => {
                const status = getEffectiveStatus(event);
                return (
                  <button
                    key={event.id}
                    onClick={(e) => onEventClick(event, e)}
                    className={`hidden sm:block w-full text-left text-xs px-1 py-0.5 rounded border truncate
                      ${STATUS_PILL_CLASSES[status]} hover:opacity-80 transition-opacity`}
                    title={event.title}
                  >
                    {event.title}
                  </button>
                );
              })}

              {/* Mobile: colored dots */}
              <div className="sm:hidden flex flex-wrap gap-0.5 justify-center">
                {day.events.slice(0, 4).map((event) => {
                  const status = getEffectiveStatus(event);
                  return (
                    <button
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_CLASSES[status]}`}
                      title={event.title}
                    />
                  );
                })}
              </div>

              {/* Overflow indicator */}
              {day.events.length > 3 && (
                <span className="hidden sm:block text-xs text-gray-500 px-1">
                  +{day.events.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Week View
// ============================================================================

interface WeekViewProps {
  weekDays: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

function WeekView({ weekDays, events, onEventClick }: WeekViewProps) {
  const hourSlots = getHourSlots();

  return (
    <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-lg">
      <div className="min-w-[560px]">
        {/* Day headers */}
        <div className="grid grid-cols-8 sticky top-0 bg-white z-10 border-b border-gray-200">
          <div className="py-2" /> {/* time column spacer */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`py-2 text-center text-xs font-medium ${
                isToday(day) ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div>{DAY_NAMES_SHORT[day.getDay()]}</div>
              <div
                className={`mx-auto mt-1 w-6 h-6 flex items-center justify-center rounded-full text-sm font-semibold ${
                  isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Hour slots */}
        {hourSlots.map((hour) => {
          const hourLabel = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: true,
          }).format(new Date(2000, 0, 1, hour));

          return (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              {/* Time label */}
              <div className="py-2 px-2 text-xs text-gray-400 text-right">{hourLabel}</div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const dayKey = toDateKey(day);
                const hourEvents = events.filter((e) => {
                  const start = new Date(e.start_date);
                  return toDateKey(start) === dayKey && start.getHours() === hour;
                });

                return (
                  <div key={dayIdx} className="min-h-[40px] border-l border-gray-100 p-0.5 relative">
                    {hourEvents.map((event) => {
                      const status = getEffectiveStatus(event);
                      return (
                        <button
                          key={event.id}
                          onClick={(e) => onEventClick(event, e)}
                          className={`w-full text-left text-xs px-1 py-0.5 rounded border truncate
                            ${STATUS_PILL_CLASSES[status]} hover:opacity-80 transition-opacity`}
                          title={event.title}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Day View
// ============================================================================

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const hourSlots = getHourSlots();
  const dateKey = toDateKey(currentDate);

  const dayEvents = events.filter((e) => {
    const start = new Date(e.start_date);
    return toDateKey(start) === dateKey;
  });

  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Day header */}
      <div
        className={`px-4 py-3 border-b border-gray-200 text-sm font-semibold ${
          isToday(currentDate) ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
        }`}
      >
        {formatter.format(currentDate)}
        {dayEvents.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="overflow-auto max-h-[560px]">
        {hourSlots.map((hour) => {
          const hourLabel = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            hour12: true,
          }).format(new Date(2000, 0, 1, hour));

          const hourEvents = dayEvents.filter((e) => {
            const start = new Date(e.start_date);
            return start.getHours() === hour;
          });

          return (
            <div key={hour} className="flex border-b border-gray-100 min-h-[48px]">
              <div className="w-20 px-3 py-2 text-xs text-gray-400 text-right flex-shrink-0">
                {hourLabel}
              </div>
              <div className="flex-1 border-l border-gray-100 p-1 space-y-1">
                {hourEvents.map((event) => {
                  const status = getEffectiveStatus(event);
                  return (
                    <button
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded border
                        ${STATUS_PILL_CLASSES[status]} hover:opacity-80 transition-opacity`}
                      title={event.title}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {formatTime(event.start_date)} – {formatTime(event.end_date)}
                        {event.venue_name && ` · ${event.venue_name}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main EventCalendarView Component
// ============================================================================

export function EventCalendarView() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch events for the visible date range
  const fetchEvents = useCallback(async (date: Date, mode: CalendarViewMode) => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getVisibleRange(date, mode);
      const startStr = toDateKey(start);
      const endStr = toDateKey(end);
      const response = await fetch(
        `/api/user/events/calendar?start=${startStr}&end=${endStr}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setEvents([]);
          return;
        }
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      setEvents(data.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentDate, viewMode);
  }, [currentDate, viewMode, fetchEvents]);

  // Navigation handlers
  function handlePrev() {
    setCurrentDate((d) => navigateDate(d, viewMode, -1));
  }

  function handleNext() {
    setCurrentDate((d) => navigateDate(d, viewMode, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Event click handler — position popover near the click
  function handleEventClick(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - containerRect.left;
      const clickY = e.clientY - containerRect.top;

      // Clamp so popover doesn't overflow the container (288px wide = w-72)
      const containerWidth = containerRect.width;
      const left = Math.min(clickX, containerWidth - 300);

      setPopoverPosition({ top: clickY + 8, left: Math.max(8, left) });
    } else {
      setPopoverPosition({ top: 80, left: 16 });
    }
    setSelectedEvent(event);
  }

  function handleClosePopover() {
    setSelectedEvent(null);
    setPopoverPosition(null);
  }

  // Compute heading text
  function getHeading(): string {
    switch (viewMode) {
      case 'month':
        return formatMonthYear(currentDate);
      case 'week': {
        const days = getWeekDays(currentDate);
        // getWeekDays always returns exactly 7 elements
        const start = days[0]!;
        const end = days[6]!;
        const sameMonth = start.getMonth() === end.getMonth();
        if (sameMonth) {
          return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(start);
        }
        const startFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start);
        const endFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end);
        return `${startFmt} – ${endFmt}`;
      }
      case 'day':
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(currentDate);
    }
  }

  // Build data for current view
  const monthDays = viewMode === 'month' ? getMonthDays(currentDate.getFullYear(), currentDate.getMonth()) : [];
  const calendarDays = viewMode === 'month' ? buildCalendarDays(monthDays, events, currentDate.getMonth()) : [];
  const weekDays = viewMode === 'week' ? getWeekDays(currentDate) : [];

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={24} className="text-blue-600" />
          Calendar
        </h1>
        <p className="text-gray-500 text-sm mt-1">Your events at a glance</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm font-semibold text-gray-800 min-w-[160px] text-center">
            {getHeading()}
          </span>

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={handleToday}
            className="ml-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Going</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Saved</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />Created</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />Past</span>
      </div>

      {/* Calendar body */}
      <div ref={containerRef} className="relative bg-white rounded-xl border border-gray-200 p-4">
        {loading ? (
          <CalendarSkeleton />
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">{error}</div>
        ) : (
          <>
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                calendarDays={calendarDays}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'week' && (
              <WeekView
                weekDays={weekDays}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}

            {/* Empty state */}
            {!loading && events.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Calendar size={40} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">No events in this period</p>
                <p className="text-xs text-gray-300 mt-1">RSVP to events or create your own to see them here</p>
              </div>
            )}
          </>
        )}

        {/* Event Quick View Popover */}
        {selectedEvent && popoverPosition && (
          <EventQuickView
            event={selectedEvent}
            position={popoverPosition}
            onClose={handleClosePopover}
          />
        )}
      </div>
    </div>
  );
}
