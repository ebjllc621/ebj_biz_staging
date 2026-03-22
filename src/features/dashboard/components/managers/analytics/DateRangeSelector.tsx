/**
 * DateRangeSelector - Date Range Picker for Analytics
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Provides preset date ranges (7d, 30d, 90d) and custom date selection
 * Follows admin analytics pattern for consistency
 */
'use client';

import React, { useState } from 'react';

export interface DateRange {
  start: string; // ISO date
  end: string;   // ISO date
}

export interface DateRangeSelectorProps {
  /** Current date range */
  dateRange: DateRange;
  /** Callback when date range changes */
  onDateRangeChange: (range: DateRange) => void;
}

type Preset = '7d' | '30d' | '90d' | 'custom';

export function DateRangeSelector({ dateRange, onDateRangeChange }: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = useState<Preset>('30d');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset);

    if (preset === 'custom') {
      setShowCustomInputs(true);
      return;
    }

    setShowCustomInputs(false);
    const end = new Date();
    const start = new Date();

    if (preset === '7d') {
      start.setDate(start.getDate() - 7);
    } else if (preset === '30d') {
      start.setDate(start.getDate() - 30);
    } else if (preset === '90d') {
      start.setDate(start.getDate() - 90);
    }

    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    if (startDate && endDate) {
      onDateRangeChange({
        start: startDate,
        end: endDate
      });
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    onDateRangeChange({
      start: field === 'start' ? value : (dateRange.start || ''),
      end: field === 'end' ? value : (dateRange.end || '')
    });
  };

  const presets: { key: Preset; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: 'custom', label: 'Custom' }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset Buttons */}
      {presets.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handlePresetClick(key)}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg transition-colors
            ${
              activePreset === key
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }
          `}
        >
          {label}
        </button>
      ))}

      {/* Custom Date Inputs - Inline when custom is selected */}
      {showCustomInputs && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleCustomDateChange('start', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleCustomDateChange('end', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      )}
    </div>
  );
}

export default DateRangeSelector;
