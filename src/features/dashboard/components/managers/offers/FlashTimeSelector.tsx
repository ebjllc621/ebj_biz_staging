/**
 * FlashTimeSelector - Time range selector for flash offer window
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Clock, AlertTriangle } from 'lucide-react';

interface FlashTimeSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  disabled?: boolean;
}

export function FlashTimeSelector({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled,
}: FlashTimeSelectorProps) {
  const calculateDuration = (): string => {
    if (!startTime || !endTime) return '';

    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);

    const startH = startParts[0] ?? 0;
    const startM = startParts[1] ?? 0;
    const endH = endParts[0] ?? 0;
    const endM = endParts[1] ?? 0;

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle overnight flash offers
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const duration = calculateDuration();
  const isLongDuration = (() => {
    if (!startTime || !endTime) return false;
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);

    const startH = startParts[0] ?? 0;
    const startM = startParts[1] ?? 0;
    const endH = endParts[0] ?? 0;
    const endM = endParts[1] ?? 0;

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    return endMinutes - startMinutes > 24 * 60;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="w-4 h-4" />
        Flash Window
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="flashStartTime" className="block text-sm text-gray-600 mb-1">
            Start Time
          </label>
          <input
            type="time"
            id="flashStartTime"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="flashEndTime" className="block text-sm text-gray-600 mb-1">
            End Time
          </label>
          <input
            type="time"
            id="flashEndTime"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          />
        </div>
      </div>

      {duration && (
        <div className={`flex items-center gap-2 text-sm ${
          isLongDuration ? 'text-amber-600' : 'text-gray-600'
        }`}>
          {isLongDuration && <AlertTriangle className="w-4 h-4" />}
          <span>
            Duration: <strong>{duration}</strong>
            {isLongDuration && ' (Flash offers work best under 24 hours)'}
          </span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Flash offers create urgency with a countdown timer. Best used for short windows (2-6 hours).
      </p>
    </div>
  );
}
