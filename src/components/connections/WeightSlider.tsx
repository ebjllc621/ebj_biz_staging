/**
 * WeightSlider - Reusable weight adjustment slider
 *
 * Renders a labeled range slider for adjusting recommendation factor weights.
 * Designed for mobile-first responsive usage.
 *
 * @pattern ui/WeightSlider
 * @category connection-preferences
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8D
 */

'use client';

import React, { useCallback } from 'react';
import * as Icons from 'lucide-react';
import { FactorMetadata } from '@features/connections/types';

interface WeightSliderProps {
  factor: FactorMetadata;
  value: number;
  onChange: (key: string, value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
}

export const WeightSlider: React.FC<WeightSliderProps> = ({
  factor,
  value,
  onChange,
  disabled = false,
  showValue = true
}) => {
  // Get icon component dynamically
  const IconComponent = (Icons as any)[factor.icon] || Icons.Circle;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(factor.key, parseInt(e.target.value, 10));
    },
    [factor.key, onChange]
  );

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <IconComponent className="w-4 h-4 text-gray-500" />
          <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {factor.label}
          </span>
        </div>
        {showValue && (
          <span className={`text-sm font-semibold ${disabled ? 'text-gray-300' : 'text-[#ed6437]'}`}>
            {value}
          </span>
        )}
      </div>
      <p className={`text-xs mb-2 ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
        {factor.description}
      </p>
      <input
        type="range"
        min="0"
        max="50"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer
          ${disabled
            ? 'bg-gray-200 cursor-not-allowed'
            : 'bg-gray-200 accent-[#ed6437]'
          }
          touch-action-manipulation
        `}
        style={{ minHeight: '44px' }} // WCAG touch target
      />
    </div>
  );
};

export default WeightSlider;
