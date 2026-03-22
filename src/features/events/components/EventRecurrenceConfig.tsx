/**
 * EventRecurrenceConfig - Recurrence settings UI for events
 *
 * Adapted from offers RecurrenceConfig for event-specific use.
 * Imported RecurrenceType from @features/offers/types (shared type, not duplicated).
 * Rendered inside EventFormModal, gated by tierAccess.allowRecurring.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3B: Recurring Events
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_3B_PLAN.md
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Info } from 'lucide-react';
import type { RecurrenceType } from '@features/offers/types';

// ============================================================================
// TYPES
// ============================================================================

export interface EventRecurrenceData {
  is_recurring: boolean;
  recurrence_type: RecurrenceType;
  recurrence_days: number[];
  recurrence_end_date: string;
}

interface EventRecurrenceConfigProps {
  value: EventRecurrenceData;
  // eslint-disable-next-line no-unused-vars
  onChange: (data: EventRecurrenceData) => void;
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'No recurrence (one-time)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function EventRecurrenceConfig({ value, onChange, disabled }: EventRecurrenceConfigProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(value.recurrence_days || []);

  useEffect(() => {
    setSelectedDays(value.recurrence_days || []);
  }, [value.recurrence_days]);

  const handleRecurringToggle = () => {
    const newIsRecurring = !value.is_recurring;
    onChange({
      ...value,
      is_recurring: newIsRecurring,
      recurrence_type: newIsRecurring ? 'weekly' : 'none',
      recurrence_days: newIsRecurring ? selectedDays : [],
      recurrence_end_date: newIsRecurring ? value.recurrence_end_date : '',
    });
  };

  const handleTypeChange = (type: RecurrenceType) => {
    onChange({
      ...value,
      recurrence_type: type,
      recurrence_days: type === 'weekly' ? selectedDays : [],
    });
  };

  const handleDayToggle = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);

    setSelectedDays(newDays);
    onChange({
      ...value,
      recurrence_days: newDays,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      recurrence_end_date: e.target.value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Recurring toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Recurring Event</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.is_recurring}
            onChange={handleRecurringToggle}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ed6437] disabled:opacity-50"></div>
        </label>
      </div>

      {value.is_recurring && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <Info className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700">
              This event repeats on a schedule. Instances will be auto-published for the next 4 weeks.
              Each instance has its own RSVP count and capacity.
            </p>
          </div>

          {/* Recurrence type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurrence Pattern
            </label>
            <select
              value={value.recurrence_type}
              onChange={(e) => handleTypeChange(e.target.value as RecurrenceType)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
            >
              {RECURRENCE_OPTIONS.filter(o => o.value !== 'none').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Day-of-week picker (weekly only) */}
          {value.recurrence_type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat on
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedDays.includes(day.value)
                        ? 'bg-[#ed6437] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End date */}
          <div>
            <label htmlFor="eventRecurrenceEndDate" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Series End Date (optional)
            </label>
            <input
              type="date"
              id="eventRecurrenceEndDate"
              value={value.recurrence_end_date || ''}
              onChange={handleEndDateChange}
              disabled={disabled}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to continue indefinitely
            </p>
          </div>
        </>
      )}
    </div>
  );
}
