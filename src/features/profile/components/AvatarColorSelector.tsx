/**
 * AvatarColorSelector - Color picker for default avatar background
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

'use client';

import { Check } from 'lucide-react';
import { AVATAR_BG_COLORS, AvatarBgColor } from '../types';

interface AvatarColorSelectorProps {
  selectedColor: string;
  onColorSelect: (color: AvatarBgColor) => void;
  disabled?: boolean;
}

export function AvatarColorSelector({
  selectedColor,
  onColorSelect,
  disabled
}: AvatarColorSelectorProps) {
  return (
    <div className="mt-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Default Avatar Background
      </label>
      <div className="flex flex-wrap gap-2">
        {AVATAR_BG_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            disabled={disabled}
            onClick={() => onColorSelect(color.value)}
            className={`
              w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center
              ${selectedColor === color.value
                ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400'
                : 'border-transparent hover:border-gray-300'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ backgroundColor: color.value }}
            title={color.label}
          >
            {selectedColor === color.value && (
              <Check className="w-4 h-4 text-white" />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        This color shows when no profile picture is uploaded
      </p>
    </div>
  );
}

export default AvatarColorSelector;
