/**
 * ImageCropper - Cropper Configuration Presets
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface CropperConfig {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  cropWidth: number;
  cropHeight: number;

  // Preview settings
  previewWidth: number;
  previewHeight: number;
  previewBorderRadius: string;
  previewBorder: string;
  previewShadow: string;

  // Control settings
  zoomMin: number;
  zoomMax: number;
  zoomStep: number;
  zoomDefault: number;

  // Behavior settings
  allowRotation: boolean;
  allowDrag: boolean;
  allowZoom: boolean;
  debounceDelay: number;

  // Visual settings
  cropBorderColor: string;
  cropBorderWidth: number;
  overlayColor: string;
  backgroundColor: string;

  // Shape mask settings (optional)
  shapeMask?: 'rectangle' | 'circle' | 'rounded';
  aspectRatioLabel?: string;
  borderRadiusPx?: number; // For 'rounded' shape mask, default 16
}

// ============================================================================
// CONTEXT-SPECIFIC CONFIGURATIONS
// ============================================================================

export const CROPPER_CONFIGS: Record<string, CropperConfig> = {
  logo: {
    canvasWidth: 600,
    canvasHeight: 400,
    cropWidth: 300,
    cropHeight: 300,
    previewWidth: 128,
    previewHeight: 128,
    previewBorderRadius: '1rem',
    previewBorder: '4px solid white',
    previewShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
    backgroundColor: '#f5f5f5'
  },

  cover: {
    canvasWidth: 1000,
    canvasHeight: 500,
    cropWidth: 960,
    cropHeight: 300,
    previewWidth: 384,
    previewHeight: 120,
    previewBorderRadius: '0.5rem',
    previewBorder: '2px solid white',
    previewShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zoomMin: 10,
    zoomMax: 225,
    zoomStep: 2,
    zoomDefault: 80,
    allowRotation: false,
    allowDrag: true,
    allowZoom: true,
    debounceDelay: 150,
    cropBorderColor: '#ed6437',
    cropBorderWidth: 2,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    backgroundColor: '#f5f5f5'
  },

  offer: {
    canvasWidth: 800,
    canvasHeight: 600,
    cropWidth: 760,
    cropHeight: 460,
    previewWidth: 320,
    previewHeight: 194,
    previewBorderRadius: '0.5rem',
    previewBorder: '2px solid white',
    previewShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zoomMin: 10,
    zoomMax: 225,
    zoomStep: 2,
    zoomDefault: 80,
    allowRotation: false,
    allowDrag: true,
    allowZoom: true,
    debounceDelay: 150,
    cropBorderColor: '#ed6437',
    cropBorderWidth: 2,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    backgroundColor: '#f5f5f5',
    shapeMask: 'rectangle',
    aspectRatioLabel: '800 × 600'
  },

  event_banner: {
    canvasWidth: 1200,
    canvasHeight: 500,
    cropWidth: 1160,
    cropHeight: 380,
    previewWidth: 384,
    previewHeight: 126,
    previewBorderRadius: '0.5rem',
    previewBorder: '2px solid white',
    previewShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zoomMin: 10,
    zoomMax: 225,
    zoomStep: 2,
    zoomDefault: 75,
    allowRotation: false,
    allowDrag: true,
    allowZoom: true,
    debounceDelay: 150,
    cropBorderColor: '#ed6437',
    cropBorderWidth: 2,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    backgroundColor: '#f5f5f5',
    shapeMask: 'rectangle',
    aspectRatioLabel: '1200 × 400'
  },

  event_thumbnail: {
    canvasWidth: 600,
    canvasHeight: 600,
    cropWidth: 380,
    cropHeight: 380,
    previewWidth: 128,
    previewHeight: 128,
    previewBorderRadius: '1rem',
    previewBorder: '4px solid white',
    previewShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
    shapeMask: 'rounded',
    aspectRatioLabel: '400 × 400',
    borderRadiusPx: 16
  },

  job_banner: {
    canvasWidth: 900,
    canvasHeight: 550,
    cropWidth: 760,
    cropHeight: 428,
    previewWidth: 320,
    previewHeight: 180,
    previewBorderRadius: '0.5rem',
    previewBorder: '2px solid white',
    previewShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zoomMin: 10,
    zoomMax: 225,
    zoomStep: 2,
    zoomDefault: 80,
    allowRotation: false,
    allowDrag: true,
    allowZoom: true,
    debounceDelay: 150,
    cropBorderColor: '#ed6437',
    cropBorderWidth: 2,
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    backgroundColor: '#f5f5f5',
    shapeMask: 'rectangle',
    aspectRatioLabel: '800 × 450'
  }
};

// ============================================================================
// CROP DATA INTERFACE
// ============================================================================

export interface CropData {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  cropWidth: number;
  cropHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}
