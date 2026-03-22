/**
 * PresetSelector - Reusable preset profile selection
 *
 * Renders a button group for selecting recommendation preset profiles.
 * Mobile-responsive with horizontal scroll on small screens.
 *
 * @pattern ui/PresetSelector
 * @category connection-preferences
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8D
 */

'use client';

import React from 'react';
import * as Icons from 'lucide-react';
import {
  RecommendationPresetProfile,
  PRESET_PROFILES,
  PresetProfileInfo
} from '@features/connections/types';

interface PresetSelectorProps {
  value: RecommendationPresetProfile | null;
  onChange: (presetId: RecommendationPresetProfile) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showDescriptions = false
}) => {
  const presets = Object.values(PRESET_PROFILES);

  return (
    <div className="space-y-2">
      {/* Mobile: Horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible -mx-2 px-2 sm:mx-0 sm:px-0">
        {presets.map((preset: PresetProfileInfo) => {
          const IconComponent = (Icons as any)[preset.icon] || Icons.Circle;
          const isSelected = value === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => !disabled && onChange(preset.id)}
              disabled={disabled}
              className={`
                flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
                min-h-[44px] touch-action-manipulation
                ${disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : isSelected
                    ? 'bg-[#ed6437]/10 border-[#ed6437] text-[#ed6437]'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-medium text-sm whitespace-nowrap">{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Description of selected preset */}
      {showDescriptions && value && PRESET_PROFILES[value] && (
        <p className="text-sm text-gray-600 px-1">
          {PRESET_PROFILES[value].description}
        </p>
      )}
    </div>
  );
};

export default PresetSelector;
