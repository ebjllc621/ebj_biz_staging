/**
 * TimeRangeFilter - Date range filter for logs
 *
 * Provides preset ranges (7d, 30d, 90d) and custom date picker
 *
 * @tier SIMPLE
 * @authority CLAUDE.md - Component Standards
 */

'use client';

import { useState, useCallback } from 'react';
import { Calendar } from 'lucide-react';

export type TimeRange = '7d' | '30d' | '90d' | 'custom';

interface TimeRangeFilterProps {
  value: TimeRange;
  // eslint-disable-next-line no-unused-vars
  onChange: (range: TimeRange, dateFrom?: string, dateTo?: string) => void;
  customDateFrom?: string;
  customDateTo?: string;
}

const presets: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' }
];

export function getDateRange(range: TimeRange): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().split('T')[0] ?? '';

  let dateFrom: string;
  switch (range) {
    case '7d':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    case '30d':
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    case '90d':
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '';
      break;
    default:
      dateFrom = '';
  }

  return { dateFrom, dateTo };
}

export function TimeRangeFilter({
  value,
  onChange,
  customDateFrom = '',
  customDateTo = ''
}: TimeRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');
  const [localDateFrom, setLocalDateFrom] = useState(customDateFrom);
  const [localDateTo, setLocalDateTo] = useState(customDateTo);

  const handlePresetChange = useCallback((range: TimeRange) => {
    if (range === 'custom') {
      setShowCustom(true);
      onChange(range, localDateFrom, localDateTo);
    } else {
      setShowCustom(false);
      const { dateFrom, dateTo } = getDateRange(range);
      onChange(range, dateFrom, dateTo);
    }
  }, [onChange, localDateFrom, localDateTo]);

  const handleCustomDateChange = useCallback((type: 'from' | 'to', dateValue: string) => {
    if (type === 'from') {
      setLocalDateFrom(dateValue);
      onChange('custom', dateValue, localDateTo);
    } else {
      setLocalDateTo(dateValue);
      onChange('custom', localDateFrom, dateValue);
    }
  }, [onChange, localDateFrom, localDateTo]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              value === preset.value
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${preset.value !== '7d' ? 'border-l border-gray-200' : ''}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={localDateFrom}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="From"
            />
          </div>
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={localDateTo}
            onChange={(e) => handleCustomDateChange('to', e.target.value)}
            className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            placeholder="To"
          />
        </div>
      )}
    </div>
  );
}
