/**
 * BusinessHoursTable - 7-Day Schedule Management Component
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD - Table-based form component
 * @phase Phase 4 - Hours of Operation
 *
 * FEATURES:
 * - 7-day schedule table UI
 * - Open/closed toggle per day
 * - Native HTML time pickers
 * - Copy to all functionality
 * - Accessible (keyboard navigation, ARIA)
 * - Mobile: Card layout; Desktop: Table layout
 */

'use client';

import { useCallback } from 'react';
import type { BusinessHours } from '../../../types/listing-form.types';
import { DAYS_OF_WEEK } from '../constants';

// ============================================================================
// TYPES
// ============================================================================

interface BusinessHoursTableProps {
  /** Current business hours array */
  businessHours: BusinessHours[];
  /** Update callback for hours changes */
  onChange: (hours: BusinessHours[]) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BusinessHoursTable({
  businessHours,
  onChange,
}: BusinessHoursTableProps) {
  // Update specific day
  const updateDay = useCallback((
    day: BusinessHours['day'],
    field: 'isOpen' | 'openTime' | 'closeTime',
    value: boolean | string
  ) => {
    const updated = businessHours.map(h =>
      h.day === day ? { ...h, [field]: value } : h
    );
    onChange(updated);
  }, [businessHours, onChange]);

  // Copy first day's hours to all days
  const copyToAll = useCallback(() => {
    if (businessHours.length === 0) return;

    const first = businessHours[0];
    if (!first) return;

    const updated = businessHours.map(h => ({
      ...h,
      isOpen: first.isOpen,
      openTime: first.openTime,
      closeTime: first.closeTime
    }));
    onChange(updated);
  }, [businessHours, onChange]);

  // Set all days open
  const setAllOpen = useCallback(() => {
    const updated = businessHours.map(h => ({
      ...h,
      isOpen: true
    }));
    onChange(updated);
  }, [businessHours, onChange]);

  // Set all days closed
  const setAllClosed = useCallback(() => {
    const updated = businessHours.map(h => ({
      ...h,
      isOpen: false
    }));
    onChange(updated);
  }, [businessHours, onChange]);

  // Capitalize day name
  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyToAll}
          className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-[#8d918d] rounded hover:bg-gray-50 transition-colors"
          aria-label="Copy first day's hours to all days"
        >
          Copy to All
        </button>
        <button
          type="button"
          onClick={setAllOpen}
          className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-[#8d918d] rounded hover:bg-gray-50 transition-colors"
          aria-label="Set all days to open"
        >
          Set All Open
        </button>
        <button
          type="button"
          onClick={setAllClosed}
          className="px-3 py-1.5 text-sm font-medium text-[#022641] bg-white border border-[#8d918d] rounded hover:bg-gray-50 transition-colors"
          aria-label="Set all days to closed"
        >
          Set All Closed
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8f9fa]">
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-[#8d918d]/20">
                Day
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-[#8d918d]/20">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-[#8d918d]/20">
                Opens
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[#022641] border-b border-[#8d918d]/20">
                Closes
              </th>
            </tr>
          </thead>
          <tbody>
            {businessHours.map((dayHours) => (
              <tr
                key={dayHours.day}
                className="border-b border-[#8d918d]/10 hover:bg-[#f8f9fa] transition-colors"
              >
                {/* Day Name */}
                <td className="px-4 py-3 text-sm font-medium text-[#022641]">
                  {capitalize(dayHours.day)}
                </td>

                {/* Open/Closed Toggle */}
                <td className="px-4 py-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayHours.isOpen}
                      onChange={(e) => updateDay(dayHours.day, 'isOpen', e.target.checked)}
                      className="w-4 h-4 text-[#ed6437] border-[#8d918d] rounded focus:ring-[#ed6437] focus:ring-offset-0"
                      aria-label={`${capitalize(dayHours.day)} is open`}
                    />
                    <span className={`text-sm font-medium ${dayHours.isOpen ? 'text-[#22c55e]' : 'text-[#8d918d]'}`}>
                      {dayHours.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </label>
                </td>

                {/* Open Time */}
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={dayHours.openTime}
                    onChange={(e) => updateDay(dayHours.day, 'openTime', e.target.value)}
                    disabled={!dayHours.isOpen}
                    className="w-full px-3 py-2 text-sm border border-[#8d918d]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent disabled:bg-gray-100 disabled:text-[#8d918d] disabled:cursor-not-allowed"
                    aria-label={`${capitalize(dayHours.day)} opening time`}
                  />
                </td>

                {/* Close Time */}
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={dayHours.closeTime}
                    onChange={(e) => updateDay(dayHours.day, 'closeTime', e.target.value)}
                    disabled={!dayHours.isOpen}
                    className="w-full px-3 py-2 text-sm border border-[#8d918d]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent disabled:bg-gray-100 disabled:text-[#8d918d] disabled:cursor-not-allowed"
                    aria-label={`${capitalize(dayHours.day)} closing time`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {businessHours.map((dayHours) => (
          <div
            key={dayHours.day}
            className="p-4 bg-white border border-[#8d918d]/20 rounded-lg"
          >
            {/* Day Name and Status */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold text-[#022641]">
                {capitalize(dayHours.day)}
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dayHours.isOpen}
                  onChange={(e) => updateDay(dayHours.day, 'isOpen', e.target.checked)}
                  className="w-4 h-4 text-[#ed6437] border-[#8d918d] rounded focus:ring-[#ed6437] focus:ring-offset-0"
                  aria-label={`${capitalize(dayHours.day)} is open`}
                />
                <span className={`text-sm font-medium ${dayHours.isOpen ? 'text-[#22c55e]' : 'text-[#8d918d]'}`}>
                  {dayHours.isOpen ? 'Open' : 'Closed'}
                </span>
              </label>
            </div>

            {/* Time Inputs */}
            {dayHours.isOpen && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8d918d] mb-1">
                    Opens
                  </label>
                  <input
                    type="time"
                    value={dayHours.openTime}
                    onChange={(e) => updateDay(dayHours.day, 'openTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#8d918d]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    aria-label={`${capitalize(dayHours.day)} opening time`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8d918d] mb-1">
                    Closes
                  </label>
                  <input
                    type="time"
                    value={dayHours.closeTime}
                    onChange={(e) => updateDay(dayHours.day, 'closeTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#8d918d]/30 rounded focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                    aria-label={`${capitalize(dayHours.day)} closing time`}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
