/**
 * RecurrenceConfig - Recurrence settings UI for templates
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import type { RecurrenceType, RecurrenceConfig as RecurrenceConfigType } from '@features/offers/types';

interface RecurrenceConfigProps {
  value: RecurrenceConfigType;
  onChange: (config: RecurrenceConfigType) => void;
  disabled?: boolean;
}

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

export function RecurrenceConfig({ value, onChange, disabled }: RecurrenceConfigProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(value.days || []);

  useEffect(() => {
    setSelectedDays(value.days || []);
  }, [value.days]);

  const handleTypeChange = (type: RecurrenceType) => {
    onChange({
      ...value,
      type,
      days: type === 'weekly' ? selectedDays : undefined,
    });
  };

  const handleDayToggle = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort((a, b) => a - b);

    setSelectedDays(newDays);
    onChange({
      ...value,
      days: newDays,
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      endDate: e.target.value ? new Date(e.target.value) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <RefreshCw className="w-4 h-4 inline-block mr-2" />
          Recurrence Pattern
        </label>
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as RecurrenceType)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
        >
          {RECURRENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {value.type === 'weekly' && (
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
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {value.type !== 'none' && (
        <div>
          <label htmlFor="recurrenceEndDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline-block mr-2" />
            End Date (optional)
          </label>
          <input
            type="date"
            id="recurrenceEndDate"
            value={value.endDate ? new Date(value.endDate).toISOString().split('T')[0] : ''}
            onChange={handleEndDateChange}
            disabled={disabled}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to continue indefinitely
          </p>
        </div>
      )}
    </div>
  );
}
