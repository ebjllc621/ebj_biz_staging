/**
 * ImageCropper - Barrel Export
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 */

export { default as InteractiveImageCropper } from './InteractiveImageCropper';
export { default as ImageCropperModal } from './ImageCropperModal';
export { CROPPER_CONFIGS } from './cropper-configs';
export type { CropperConfig, CropData } from './cropper-configs';
export { default as EnhancedImageCropperModal } from './EnhancedImageCropperModal';
export { default as AspectRatioSelector } from './AspectRatioSelector';
export { ASPECT_RATIO_PRESETS, getPresetConfig } from './enhanced-cropper-configs';
export type { AspectRatioPreset, ShapeMask, CropMetadata } from './enhanced-cropper-configs';
