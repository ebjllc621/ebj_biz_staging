/**
 * GeoFenceRadius - Radius slider/input for geo-fence
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Radio } from 'lucide-react';

interface GeoFenceRadiusProps {
  value: number;
  onChange: (radius: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

const PRESET_RADII = [
  { value: 100, label: '100m' },
  { value: 250, label: '250m' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 2000, label: '2km' },
  { value: 5000, label: '5km' },
];

export function GeoFenceRadius({
  value,
  onChange,
  min = 50,
  max = 10000,
  disabled,
}: GeoFenceRadiusProps) {
  const formatRadius = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <Radio className="w-4 h-4" />
          Trigger Radius
        </label>
        <span className="text-sm font-medium text-purple-600">
          {formatRadius(value)}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESET_RADII.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            disabled={disabled}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              value === preset.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Input */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              onChange(newValue);
            }
          }}
          min={min}
          max={max}
          disabled={disabled}
          className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
        />
        <span className="text-sm text-gray-500">meters</span>
      </div>

      <p className="text-xs text-gray-500">
        Users within this radius will receive a notification about your offer.
      </p>
    </div>
  );
}
