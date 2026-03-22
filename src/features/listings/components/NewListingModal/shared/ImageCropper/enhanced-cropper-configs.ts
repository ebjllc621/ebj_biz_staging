/**
 * ImageCropper - Enhanced Cropper Configuration with Aspect Ratio Presets
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 1 - Enhanced Cropper System
 */

import type { CropperConfig } from './cropper-configs';

// ============================================================================
// TYPES
// ============================================================================

export type ShapeMask = 'rectangle' | 'circle' | 'rounded';

export interface AspectRatioPreset {
  key: string;
  label: string;
  icon: string;
  aspectRatio: number;
  shapeMask: ShapeMask;
  cropWidth: number;
  cropHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  previewWidth: number;
  previewHeight: number;
  previewBorderRadius: string;
  description: string;
}

export interface CropMetadata {
  presetKey: string;
  shapeMask: ShapeMask;
  aspectRatio: number;
  cropWidth: number;
  cropHeight: number;
}

// ============================================================================
// BASE CONFIG (shared zoom/drag/rotation/border settings)
// ============================================================================

export const BASE_ENHANCED_CONFIG: Partial<CropperConfig> = {
  zoomMin: 10,
  zoomMax: 225,
  zoomStep: 2,
  zoomDefault: 75,
  allowRotation: true,
  allowDrag: true,
  allowZoom: true,
  debounceDelay: 100,
  cropBorderColor: '#ed6437',
  cropBorderWidth: 2,
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  backgroundColor: '#f5f5f5',
  previewBorder: '2px solid white',
  previewShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};

// ============================================================================
// ASPECT RATIO PRESETS
// ============================================================================

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  {
    key: 'landscape-16-9',
    label: 'Landscape 16:9',
    icon: '🖼',
    aspectRatio: 1.778,
    shapeMask: 'rectangle',
    cropWidth: 640,
    cropHeight: 360,
    canvasWidth: 800,
    canvasHeight: 500,
    previewWidth: 256,
    previewHeight: 144,
    previewBorderRadius: '0.25rem',
    description: 'Wide landscape format, ideal for banners and hero images'
  },
  {
    key: 'landscape-4-3',
    label: 'Landscape 4:3',
    icon: '📷',
    aspectRatio: 1.333,
    shapeMask: 'rectangle',
    cropWidth: 600,
    cropHeight: 450,
    canvasWidth: 800,
    canvasHeight: 550,
    previewWidth: 240,
    previewHeight: 180,
    previewBorderRadius: '0.25rem',
    description: 'Classic photo format, great for general gallery images'
  },
  {
    key: 'portrait-3-4',
    label: 'Portrait 3:4',
    icon: '📱',
    aspectRatio: 0.75,
    shapeMask: 'rectangle',
    cropWidth: 375,
    cropHeight: 500,
    canvasWidth: 550,
    canvasHeight: 600,
    previewWidth: 150,
    previewHeight: 200,
    previewBorderRadius: '0.25rem',
    description: 'Tall portrait format, ideal for mobile-first displays'
  },
  {
    key: 'portrait-2-3',
    label: 'Portrait 2:3',
    icon: '📋',
    aspectRatio: 0.667,
    shapeMask: 'rectangle',
    cropWidth: 400,
    cropHeight: 600,
    canvasWidth: 550,
    canvasHeight: 700,
    previewWidth: 160,
    previewHeight: 240,
    previewBorderRadius: '0.25rem',
    description: 'Slim portrait format for product cards and posters'
  },
  {
    key: 'square',
    label: 'Square 1:1',
    icon: '⬛',
    aspectRatio: 1.0,
    shapeMask: 'rectangle',
    cropWidth: 400,
    cropHeight: 400,
    canvasWidth: 600,
    canvasHeight: 500,
    previewWidth: 200,
    previewHeight: 200,
    previewBorderRadius: '0.25rem',
    description: 'Perfect square format for thumbnails and profile images'
  },
  {
    key: 'circle',
    label: 'Circle',
    icon: '⭕',
    aspectRatio: 1.0,
    shapeMask: 'circle',
    cropWidth: 400,
    cropHeight: 400,
    canvasWidth: 600,
    canvasHeight: 500,
    previewWidth: 200,
    previewHeight: 200,
    previewBorderRadius: '50%',
    description: 'Circular crop for avatars and profile photos'
  },
  {
    key: 'rounded',
    label: 'Rounded Square',
    icon: '🔲',
    aspectRatio: 1.0,
    shapeMask: 'rounded',
    cropWidth: 400,
    cropHeight: 400,
    canvasWidth: 600,
    canvasHeight: 500,
    previewWidth: 200,
    previewHeight: 200,
    previewBorderRadius: '1rem',
    description: 'Rounded corners format for modern card-style displays'
  }
];

// ============================================================================
// HELPER FUNCTION
// ============================================================================

export function getPresetConfig(preset: AspectRatioPreset): CropperConfig {
  return {
    ...BASE_ENHANCED_CONFIG,
    canvasWidth: preset.canvasWidth,
    canvasHeight: preset.canvasHeight,
    cropWidth: preset.cropWidth,
    cropHeight: preset.cropHeight,
    previewWidth: preset.previewWidth,
    previewHeight: preset.previewHeight,
    previewBorderRadius: preset.previewBorderRadius,
    shapeMask: preset.shapeMask,
    aspectRatioLabel: preset.label,
    borderRadiusPx: preset.shapeMask === 'rounded' ? 16 : undefined
  } as CropperConfig;
}
