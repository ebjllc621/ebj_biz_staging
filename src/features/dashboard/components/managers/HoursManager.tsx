/**
 * HoursManager - Manage Business Hours
 *
 * @description Edit weekly schedule with day-by-day open/close times,
 *   hours status (timetable/24-7/closed), and timezone selection.
 *   Syncs with Section3Hours in the new/edit listing modal.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @reference src/features/listings/components/NewListingModal/sections/Section3Hours.tsx
 * @reference src/features/listings/components/NewListingModal/components/BusinessHoursTable.tsx
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

// ============================================================================
// CONSTANTS (aligned with NewListingModal/constants.ts)
// ============================================================================

const DAYS_ORDER = [
  { key: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { key: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { key: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { key: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { key: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
];

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
];

// ============================================================================
// TYPES
// ============================================================================

type HoursStatus = 'timetable' | '24-7' | 'closed';

interface DayHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

// ============================================================================
// DATA NORMALIZATION
// Handles multiple legacy DB formats:
// - [{day, open: "09:00", close: "17:00"}]  (canonical flat array)
// - [{day, open: true, startTime, endTime}]  (legacy boolean format)
// - [{day, open: "closed", close: "closed"}] (legacy string-closed format)
// - {timezone, is247, isClosed, schedule: [...]}  (modal wrapper format)
// ============================================================================

function getDefaultHours(): DayHours[] {
  return DAYS_ORDER.map(d => ({
    day: d.key,
    isOpen: d.key !== 'saturday' && d.key !== 'sunday',
    openTime: '09:00',
    closeTime: '17:00',
  }));
}

function normalizeBusinessHours(raw: unknown): DayHours[] {
  if (!raw) return getDefaultHours();

  let schedule: unknown[] | null = null;

  // Handle wrapper object format: { schedule: [...], timezone, is247, isClosed }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.schedule)) {
      schedule = obj.schedule;
    } else {
      return getDefaultHours();
    }
  }

  // Handle flat array format
  if (Array.isArray(raw)) {
    schedule = raw;
  }

  if (!schedule || schedule.length === 0) {
    return getDefaultHours();
  }

  return DAYS_ORDER.map(d => {
    const entry = schedule!.find((h: unknown) =>
      (h as Record<string, unknown>)?.day?.toString().toLowerCase() === d.key
    ) as Record<string, unknown> | undefined;

    if (!entry) {
      return { day: d.key, isOpen: false, openTime: '09:00', closeTime: '17:00' };
    }

    // Format 1: { day, open: "09:00", close: "17:00" } (canonical)
    if (typeof entry.open === 'string' && typeof entry.close === 'string') {
      const isClosed = entry.open === 'closed' || entry.close === 'closed'
        || entry.open === '' || entry.close === '';
      return {
        day: d.key,
        isOpen: !isClosed,
        openTime: isClosed ? '09:00' : entry.open as string,
        closeTime: isClosed ? '17:00' : entry.close as string,
      };
    }

    // Format 2: { day, isOpen: true, openTime, closeTime } (modal schedule format)
    if ('isOpen' in entry && 'openTime' in entry) {
      return {
        day: d.key,
        isOpen: Boolean(entry.isOpen),
        openTime: (entry.openTime as string) || '09:00',
        closeTime: (entry.closeTime as string) || '17:00',
      };
    }

    // Format 3: { day, open: true/false, startTime, endTime } (legacy)
    if (typeof entry.open === 'boolean') {
      return {
        day: d.key,
        isOpen: entry.open,
        openTime: (entry.startTime as string) || (entry.open_time as string) || '09:00',
        closeTime: (entry.endTime as string) || (entry.close_time as string) || '17:00',
      };
    }

    return { day: d.key, isOpen: false, openTime: '09:00', closeTime: '17:00' };
  });
}

/**
 * Format time from 24h to 12h for display
 */
function formatTime12h(time: string): string {
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) return time;
  const hours = parts[0];
  const minutes = parts[1];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function HoursManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(getDefaultHours());
  const [hoursStatus, setHoursStatus] = useState<HoursStatus>('timetable');
  const [timezone, setTimezone] = useState('America/New_York');

  // Initialize from full listing data
  useEffect(() => {
    if (listing) {
      setHours(normalizeBusinessHours(listing.business_hours));
      // Read hours_status from the dedicated DB column
      const status = listing.hours_status;
      if (status === '24-7' || status === 'closed' || status === 'timetable') {
        setHoursStatus(status);
      } else {
        setHoursStatus('timetable');
      }
      setTimezone(listing.timezone || 'America/New_York');
    }
  }, [listing]);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setHours(normalizeBusinessHours(listing.business_hours));
      const status = listing.hours_status;
      if (status === '24-7' || status === 'closed' || status === 'timetable') {
        setHoursStatus(status);
      } else {
        setHoursStatus('timetable');
      }
      setTimezone(listing.timezone || 'America/New_York');
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      // Convert to canonical DB format: flat array of open days
      const apiHours = hoursStatus === 'timetable'
        ? hours
            .filter(h => h.isOpen)
            .map(h => ({
              day: h.day,
              open: h.openTime,
              close: h.closeTime,
            }))
        : [];

      await updateListing({
        business_hours: apiHours,
        hours_status: hoursStatus,
        timezone: timezone,
      });
      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [hours, hoursStatus, timezone, updateListing, refreshListing, refreshListings]);

  const handleDayToggle = useCallback((day: string) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, isOpen: !h.isOpen } : h));
  }, []);

  const handleTimeChange = useCallback((day: string, field: 'openTime' | 'closeTime', value: string) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h));
  }, []);

  const handleCopyToAll = useCallback(() => {
    setHours(prev => {
      const first = prev[0];
      if (!first) return prev;
      return prev.map(h => ({
        ...h,
        isOpen: first.isOpen,
        openTime: first.openTime,
        closeTime: first.closeTime,
      }));
    });
  }, []);

  const handleSetAllOpen = useCallback(() => {
    setHours(prev => prev.map(h => ({ ...h, isOpen: true })));
  }, []);

  const handleSetAllClosed = useCallback(() => {
    setHours(prev => prev.map(h => ({ ...h, isOpen: false })));
  }, []);

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error loading data
  if (loadError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{loadError}</span>
        <button
          onClick={() => refreshListing()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-8 text-gray-600">No listing selected</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit/Save/Cancel */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#ed6437]" />
          Business Hours
        </h2>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW MODE */}
      {/* ================================================================ */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* Hours Status Display */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">Status:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              hoursStatus === 'timetable'
                ? 'bg-blue-100 text-blue-700'
                : hoursStatus === '24-7'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {hoursStatus === 'timetable' ? 'Timetable' : hoursStatus === '24-7' ? 'Open 24/7' : 'Closed'}
            </span>
            <span className="text-sm font-medium text-gray-500 ml-4">Timezone:</span>
            <span className="text-sm text-gray-700">
              {US_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
            </span>
          </div>

          {/* 24/7 Message */}
          {hoursStatus === '24-7' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Open 24/7</div>
                  <div className="text-sm text-gray-600">
                    This listing is open 24 hours a day, 7 days a week.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Closed Message */}
          {hoursStatus === 'closed' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">Temporarily Closed</div>
                  <div className="text-sm text-gray-600">
                    This listing is displayed as temporarily closed. Edit to update when you resume operations.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timetable Schedule Display */}
          {hoursStatus === 'timetable' && (
            <div className="space-y-2">
              {DAYS_ORDER.map((day) => {
                const dayData = hours.find(h => h.day === day.key) || {
                  day: day.key, isOpen: false, openTime: '09:00', closeTime: '17:00',
                };
                return (
                  <div key={day.key} className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-lg">
                    <span className="font-medium text-gray-900 w-28">{day.label}</span>
                    {dayData.isOpen ? (
                      <span className="text-gray-900">
                        {formatTime12h(dayData.openTime)} - {formatTime12h(dayData.closeTime)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================================================================ */
        /* EDIT MODE                                                        */
        /* ================================================================ */
        <div className="space-y-6">
          {/* Hours Status Selector (matches Section3Hours) */}
          <div>
            <label className="block text-sm font-semibold text-[#022641] mb-3">
              Hours Status <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Timetable */}
              <button
                type="button"
                onClick={() => setHoursStatus('timetable')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  hoursStatus === 'timetable'
                    ? 'border-[#ed6437] bg-[#ed6437]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    hoursStatus === 'timetable' ? 'border-[#ed6437]' : 'border-gray-400'
                  }`}>
                    {hoursStatus === 'timetable' && <div className="w-3 h-3 rounded-full bg-[#ed6437]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-[#022641] mb-1">Timetable</div>
                    <div className="text-sm text-gray-500">Set specific hours for each day</div>
                  </div>
                </div>
              </button>

              {/* 24/7 */}
              <button
                type="button"
                onClick={() => setHoursStatus('24-7')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  hoursStatus === '24-7'
                    ? 'border-[#ed6437] bg-[#ed6437]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    hoursStatus === '24-7' ? 'border-[#ed6437]' : 'border-gray-400'
                  }`}>
                    {hoursStatus === '24-7' && <div className="w-3 h-3 rounded-full bg-[#ed6437]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-[#022641] mb-1">24/7</div>
                    <div className="text-sm text-gray-500">Open 24 hours, 7 days a week</div>
                  </div>
                </div>
              </button>

              {/* Closed */}
              <button
                type="button"
                onClick={() => setHoursStatus('closed')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  hoursStatus === 'closed'
                    ? 'border-[#ed6437] bg-[#ed6437]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    hoursStatus === 'closed' ? 'border-[#ed6437]' : 'border-gray-400'
                  }`}>
                    {hoursStatus === 'closed' && <div className="w-3 h-3 rounded-full bg-[#ed6437]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-[#022641] mb-1">Closed</div>
                    <div className="text-sm text-gray-500">Currently not operating</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Timezone Selector */}
          <div>
            <label htmlFor="hours-timezone" className="block text-sm font-semibold text-[#022641] mb-2">
              Timezone <span className="text-red-500">*</span>
            </label>
            <select
              id="hours-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Select the timezone for your business location
            </p>
          </div>

          {/* Timetable Schedule Editor */}
          {hoursStatus === 'timetable' && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#022641]">
                Weekly Schedule
              </label>

              {/* Bulk Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyToAll}
                  className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Copy to All
                </button>
                <button
                  type="button"
                  onClick={handleSetAllOpen}
                  className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Set All Open
                </button>
                <button
                  type="button"
                  onClick={handleSetAllClosed}
                  className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Set All Closed
                </button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-gray-200">Day</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-gray-200">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-gray-200">Opens</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-gray-200">Closes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_ORDER.map((day) => {
                      const dayData = hours.find(h => h.day === day.key) || {
                        day: day.key, isOpen: false, openTime: '09:00', closeTime: '17:00',
                      };
                      return (
                        <tr key={day.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-[#022641]">{day.label}</td>
                          <td className="px-4 py-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={dayData.isOpen}
                                onChange={() => handleDayToggle(day.key)}
                                className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
                              />
                              <span className={`text-sm font-medium ${dayData.isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                                {dayData.isOpen ? 'Open' : 'Closed'}
                              </span>
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={dayData.openTime}
                              onChange={(e) => handleTimeChange(day.key, 'openTime', e.target.value)}
                              disabled={!dayData.isOpen}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              value={dayData.closeTime}
                              onChange={(e) => handleTimeChange(day.key, 'closeTime', e.target.value)}
                              disabled={!dayData.isOpen}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {DAYS_ORDER.map((day) => {
                  const dayData = hours.find(h => h.day === day.key) || {
                    day: day.key, isOpen: false, openTime: '09:00', closeTime: '17:00',
                  };
                  return (
                    <div key={day.key} className="p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-base font-semibold text-[#022641]">{day.label}</h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dayData.isOpen}
                            onChange={() => handleDayToggle(day.key)}
                            className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
                          />
                          <span className={`text-sm font-medium ${dayData.isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                            {dayData.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </label>
                      </div>
                      {dayData.isOpen && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Opens</label>
                            <input
                              type="time"
                              value={dayData.openTime}
                              onChange={(e) => handleTimeChange(day.key, 'openTime', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Closes</label>
                            <input
                              type="time"
                              value={dayData.closeTime}
                              onChange={(e) => handleTimeChange(day.key, 'closeTime', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 24/7 Status Message */}
          {hoursStatus === '24-7' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-[#022641] mb-1">Open 24/7</div>
                  <div className="text-sm text-gray-500">
                    Your listing will display as open 24 hours a day, 7 days a week.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Closed Status Message */}
          {hoursStatus === 'closed' && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-[#022641] mb-1">Temporarily Closed</div>
                  <div className="text-sm text-gray-500">
                    Your listing will display as temporarily closed. Update when you resume operations.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function HoursManager() {
  return (
    <ErrorBoundary componentName="HoursManager">
      <HoursManagerContent />
    </ErrorBoundary>
  );
}

export default HoursManager;
