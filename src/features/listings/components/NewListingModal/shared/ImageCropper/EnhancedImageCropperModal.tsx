'use client';

/**
 * EnhancedImageCropperModal - Multi-preset image cropper modal with shape mask support
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 1 - Enhanced Cropper System
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import InteractiveImageCropper from './InteractiveImageCropper';
import AspectRatioSelector from './AspectRatioSelector';
import { ASPECT_RATIO_PRESETS, getPresetConfig } from './enhanced-cropper-configs';
import type { AspectRatioPreset, CropMetadata } from './enhanced-cropper-configs';
import type { CropperConfig } from './cropper-configs';

// ============================================================================
// TYPES
// ============================================================================

interface EnhancedImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (_croppedImageDataUrl: string, _metadata: CropMetadata) => void;
  imageUrl: string;
  allowedPresets?: string[];
  defaultPreset?: string;
  customConfig?: Partial<CropperConfig>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EnhancedImageCropperModal({
  isOpen,
  onClose,
  onApply,
  imageUrl,
  allowedPresets,
  defaultPreset = 'square',
  customConfig
}: EnhancedImageCropperModalProps) {

  // Filter presets by allowedPresets if provided; fallback to full list if filter yields empty
  const availablePresets = useMemo<AspectRatioPreset[]>(() => {
    if (allowedPresets && allowedPresets.length > 0) {
      const filtered = ASPECT_RATIO_PRESETS.filter((p) => allowedPresets.includes(p.key));
      return filtered.length > 0 ? filtered : ASPECT_RATIO_PRESETS;
    }
    return ASPECT_RATIO_PRESETS;
  }, [allowedPresets]);

  // Resolve default preset - fall back to first available
  const resolvedDefaultKey = useMemo(() => {
    const found = availablePresets.find((p) => p.key === defaultPreset);
    return found ? found.key : (availablePresets[0]?.key ?? 'square');
  }, [availablePresets, defaultPreset]);

  // availablePresets is guaranteed non-empty (falls back to ASPECT_RATIO_PRESETS which has 7 entries)
  const [selectedPreset, setSelectedPreset] = useState<AspectRatioPreset>(() => {
    return availablePresets.find((p) => p.key === resolvedDefaultKey) ?? availablePresets[0]!;
  });

  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  // Key to force remount of InteractiveImageCropper on preset change (resets position/zoom)
  const [cropperKey, setCropperKey] = useState(0);

  // Merged config for current preset
  const mergedConfig = useMemo<Partial<CropperConfig>>(() => {
    const presetConfig = getPresetConfig(selectedPreset);
    return {
      ...presetConfig,
      ...customConfig
    };
  }, [selectedPreset, customConfig]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCroppedPreview(null);
      setCropperKey(0);
      // Reset to default preset
      const defaultP = availablePresets.find((p) => p.key === resolvedDefaultKey) ?? availablePresets[0];
      if (defaultP) {
        setSelectedPreset(defaultP);
      }
    }
  }, [isOpen, availablePresets, resolvedDefaultKey]);

  const handlePresetSelect = useCallback((preset: AspectRatioPreset) => {
    setSelectedPreset(preset);
    setCroppedPreview(null);
    // Remount cropper to reset image position and zoom
    setCropperKey((prev) => prev + 1);
  }, []);

  const handlePreviewUpdate = useCallback((previewUrl: string) => {
    setCroppedPreview(previewUrl);
  }, []);

  const handleApply = useCallback(() => {
    if (!croppedPreview) return;

    const metadata: CropMetadata = {
      presetKey: selectedPreset.key,
      shapeMask: selectedPreset.shapeMask,
      aspectRatio: selectedPreset.aspectRatio,
      cropWidth: selectedPreset.cropWidth,
      cropHeight: selectedPreset.cropHeight
    };

    onApply(croppedPreview, metadata);
  }, [croppedPreview, selectedPreset, onApply]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crop Image"
      maxWidth="4xl"
      closeOnBackdropClick={false}
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleApply}
            disabled={!croppedPreview}
          >
            Apply Changes
          </BizModalButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Aspect Ratio Selector */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Select Format
          </p>
          <AspectRatioSelector
            presets={availablePresets}
            selectedKey={selectedPreset.key}
            onSelect={handlePresetSelect}
          />
        </div>

        {/* Cropper */}
        <InteractiveImageCropper
          key={cropperKey}
          imageUrl={imageUrl}
          context="logo"
          customConfig={mergedConfig}
          shapeMask={selectedPreset.shapeMask}
          borderRadiusPx={selectedPreset.shapeMask === 'rounded' ? 16 : undefined}
          onPreviewUpdate={handlePreviewUpdate}
        />

        {/* Selected preset info */}
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
          <span className="font-medium text-gray-700">{selectedPreset.label}</span>
          <span className="text-gray-400">&mdash;</span>
          <span>{selectedPreset.description}</span>
          <span className="ml-auto text-gray-400 whitespace-nowrap">
            {selectedPreset.cropWidth} &times; {selectedPreset.cropHeight}px
          </span>
        </div>
      </div>
    </BizModal>
  );
}
