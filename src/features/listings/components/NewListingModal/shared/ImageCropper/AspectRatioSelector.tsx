'use client';

/**
 * AspectRatioSelector - Horizontal scrollable preset selector for image cropper
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 1 - Enhanced Cropper System
 */

import React, { useCallback, useRef } from 'react';
import type { AspectRatioPreset } from './enhanced-cropper-configs';

// ============================================================================
// TYPES
// ============================================================================

interface AspectRatioSelectorProps {
  presets: AspectRatioPreset[];
  selectedKey: string;
  onSelect: (_preset: AspectRatioPreset) => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getShapeStyle(preset: AspectRatioPreset): React.CSSProperties {
  const maxSize = 32;
  let width: number;
  let height: number;

  if (preset.aspectRatio >= 1) {
    width = maxSize;
    height = Math.round(maxSize / preset.aspectRatio);
  } else {
    height = maxSize;
    width = Math.round(maxSize * preset.aspectRatio);
  }

  // Clamp
  width = Math.max(12, width);
  height = Math.max(12, height);

  const borderRadius =
    preset.shapeMask === 'circle'
      ? '50%'
      : preset.shapeMask === 'rounded'
      ? '4px'
      : '2px';

  return {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius,
    backgroundColor: '#e5e7eb',
    flexShrink: 0
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AspectRatioSelector({
  presets,
  selectedKey,
  onSelect,
  className = ''
}: AspectRatioSelectorProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % presets.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + presets.length) % presets.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = presets.length - 1;
    }

    if (nextIndex !== null) {
      const target = presets[nextIndex];
      if (target) {
        buttonRefs.current[nextIndex]?.focus();
        onSelect(target);
      }
    }
  }, [presets, onSelect]);

  return (
    <div
      role="radiogroup"
      aria-label="Aspect ratio presets"
      className={`flex flex-row gap-2 overflow-x-auto pb-1 ${className}`}
    >
      {presets.map((preset, index) => {
        const isSelected = preset.key === selectedKey;

        return (
          <button
            key={preset.key}
            ref={(el) => { buttonRefs.current[index] = el; }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={preset.label}
            title={preset.description}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(preset)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border transition-colors flex-shrink-0 min-w-[64px] focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:ring-offset-1',
              isSelected
                ? 'border-[#ed6437] bg-orange-50 text-[#ed6437]'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
            ].join(' ')}
          >
            <div
              style={getShapeStyle(preset)}
              className={isSelected ? 'bg-orange-200' : 'bg-gray-200'}
            />
            <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">
              {preset.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
