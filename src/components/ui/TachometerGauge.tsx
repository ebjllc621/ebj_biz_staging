/**
 * TachometerGauge - Visual gauge component for metrics display
 *
 * @authority Build Map v2.1 ENHANCED
 * @tier SIMPLE (reusable UI component)
 * @phase Database Manager Enhancement
 */

'use client';

import { memo } from 'react';

interface TachometerGaugeProps {
  /** Current value (0-100) */
  value: number;
  /** Primary label (e.g., "Memory Usage") */
  label: string;
  /** Secondary label (e.g., "1.38 GB / 3.8 GB") */
  subLabel?: string;
  /** Threshold configuration */
  thresholds?: {
    /** Yellow zone start (default: 60) */
    warning: number;
    /** Red zone start (default: 80) */
    critical: number;
  };
  /** Gauge size variant */
  size?: 'small' | 'medium' | 'large';
}

/**
 * TachometerGauge - Displays a semi-circular gauge with color-coded zones
 */
export const TachometerGauge = memo(function TachometerGauge({
  value,
  label,
  subLabel,
  thresholds = { warning: 60, critical: 80 },
  size = 'medium'
}: TachometerGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const getColor = (val: number): string => {
    if (val >= thresholds.critical) return '#ef4444'; // red-500
    if (val >= thresholds.warning) return '#f59e0b';  // amber-500
    return '#22c55e'; // green-500
  };

  const getStatus = (val: number): string => {
    if (val >= thresholds.critical) return 'Critical';
    if (val >= thresholds.warning) return 'Warning';
    return 'Healthy';
  };

  const sizeClasses: Record<string, string> = {
    small: 'w-32 h-20',
    medium: 'w-48 h-28',
    large: 'w-64 h-36'
  };

  // Font sizes for SVG text (must be numeric, not Tailwind classes)
  const fontSizes: Record<string, number> = {
    small: 14,
    medium: 16,
    large: 18
  };

  // SVG arc calculation - semicircle from left to right
  const radius = 40;
  const circumference = Math.PI * radius; // Half circle
  const offset = circumference - (clampedValue / 100) * circumference;

  const color = getColor(clampedValue);
  const status = getStatus(clampedValue);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg viewBox="0 0 100 60" className="w-full h-full">
          {/* Background arc (gray) */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Filled arc (colored based on value) */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />

          {/* Center value text - baseline aligned with arc bottom (y=55) */}
          <text
            x="50"
            y="52"
            textAnchor="middle"
            fontSize={fontSizes[size]}
            fontWeight="bold"
            fill={color}
          >
            {clampedValue.toFixed(1)}%
          </text>
        </svg>
      </div>

      {/* Labels below gauge */}
      <div className="text-center mt-2">
        <div className="font-medium text-gray-900">{label}</div>
        {subLabel && <div className="text-sm text-gray-600">{subLabel}</div>}
        <div
          className={`text-xs font-medium mt-1 ${
            clampedValue >= thresholds.critical
              ? 'text-red-600'
              : clampedValue >= thresholds.warning
                ? 'text-amber-600'
                : 'text-green-600'
          }`}
        >
          {status}
        </div>
      </div>
    </div>
  );
});
