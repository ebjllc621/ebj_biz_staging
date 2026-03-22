/**
 * ImageCropperModal - BizModal Wrapper for Image Cropper
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 *
 * FEATURES:
 * - BizModal wrapper (MANDATORY for all modals)
 * - Apply/Cancel actions
 * - Escape key to close
 * - Accessibility (role="dialog", aria-modal)
 */

'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import InteractiveImageCropper from './InteractiveImageCropper';
import type { CropperConfig, CropData } from './cropper-configs';
import { CROPPER_CONFIGS } from './cropper-configs';

// ============================================================================
// TYPES
// ============================================================================

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (_croppedImageDataUrl: string) => void;
  imageUrl: string;
  context: keyof typeof CROPPER_CONFIGS;
  customConfig?: Partial<CropperConfig>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ImageCropperModal({
  isOpen,
  onClose,
  onApply,
  imageUrl,
  context,
  customConfig = {}
}: ImageCropperModalProps) {
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const cropDataRef = useRef<CropData | null>(null);

  // Handle preview updates from cropper
  const handlePreviewUpdate = useCallback((previewUrl: string) => {
    setCroppedPreview(previewUrl);
  }, []);

  // Handle crop data changes (for debugging/future use)
  const handleCropChange = useCallback((cropData: CropData) => {
    cropDataRef.current = cropData;
  }, []);

  // Handle apply button click
  const handleApply = useCallback(() => {
    if (croppedPreview) {
      onApply(croppedPreview);
      onClose();
    }
  }, [croppedPreview, onApply, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCroppedPreview(null);
      cropDataRef.current = null;
    }
  }, [isOpen]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Crop ${context === 'logo' ? 'Logo' : 'Cover Image'}`}
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
      <div className="py-4">
        <InteractiveImageCropper
          imageUrl={imageUrl}
          context={context}
          customConfig={customConfig}
          onPreviewUpdate={handlePreviewUpdate}
          onCropChange={handleCropChange}
          showDebug={false}
        />
      </div>
    </BizModal>
  );
}
