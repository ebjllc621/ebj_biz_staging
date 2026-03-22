'use client';

/**
 * UniversalMediaUploadModal - Multi-step media upload modal
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Flow: UploadDropZone -> SEO fields -> (optional crop) -> upload -> complete
 *
 * MANDATORY: BizModal wrapper
 * MANDATORY: useUniversalMedia via useMediaUploadModal (no direct API calls)
 * MANDATORY: closeOnBackdropClick={false}
 * MANDATORY: 'use client' directive
 */

import React, { useCallback, useEffect, useState } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { EnhancedImageCropperModal } from '@features/listings/components/NewListingModal/shared/ImageCropper';
import type { CropMetadata } from '@features/listings/components/NewListingModal/shared/ImageCropper';
import UploadDropZone from './UploadDropZone';
import FeatureTipsPanel from './FeatureTipsPanel';
import { useMediaUploadModal } from '../hooks/useMediaUploadModal';
import type { UploadContext, SEOFields, MediaUploadResult } from '../types/upload-types';

// ============================================================================
// TYPES
// ============================================================================

interface UniversalMediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Context determines entity and media type slot */
  uploadContext: UploadContext;
  /** Modal title shown in BizModal header */
  title?: string;
  /** Called on successful upload */
  onUploadComplete?: (_result: MediaUploadResult) => void;
  /** Accepted MIME types for the drop zone */
  acceptedFormats?: string;
  /** Max file size in MB */
  maxFileSizeMB?: number;
  /** Aspect ratio presets to show in cropper (undefined = all) */
  allowedCropPresets?: string[];
  /** Default crop preset key */
  defaultCropPreset?: string;
}

// ============================================================================
// ICONS
// ============================================================================

function CheckCircleIcon() {
  return (
    <svg
      className="w-12 h-12 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg
      className="w-12 h-12 text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ============================================================================
// SEO FIELDS SUBCOMPONENT
// ============================================================================

interface SEOFieldsFormProps {
  values: SEOFields;
  onChange: (_fields: SEOFields) => void;
  disabled?: boolean;
}

function SEOFieldsForm({ values, onChange, disabled = false }: SEOFieldsFormProps) {
  const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, altText: e.target.value });
  };
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, titleText: e.target.value });
  };

  return (
    <div className="space-y-3">
      {/* Alt text - required */}
      <div>
        <label
          htmlFor="upload-alt-text"
          className="block text-sm font-semibold text-[#022641] mb-1"
        >
          Alt text <span className="text-red-500">*</span>
        </label>
        <input
          id="upload-alt-text"
          type="text"
          value={values.altText}
          onChange={handleAltChange}
          disabled={disabled}
          placeholder="Describe what is in this image..."
          maxLength={255}
          className={[
            'w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            values.altText.trim() ? 'border-gray-300' : 'border-orange-300',
          ].join(' ')}
          aria-required="true"
          aria-describedby="upload-alt-text-hint"
        />
        <p id="upload-alt-text-hint" className="text-xs text-gray-500 mt-1">
          Required. Used by screen readers and search engines. Also generates the SEO filename.
        </p>
      </div>

      {/* Title text - optional */}
      <div>
        <label
          htmlFor="upload-title-text"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Title text{' '}
          <span className="text-xs font-normal text-gray-400">(optional, max 60 chars)</span>
        </label>
        <input
          id="upload-title-text"
          type="text"
          value={values.titleText ?? ''}
          onChange={handleTitleChange}
          disabled={disabled}
          placeholder="Shown as tooltip on hover..."
          maxLength={60}
          className={[
            'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          ].join(' ')}
        />
      </div>
    </div>
  );
}

// ============================================================================
// UPLOAD PROGRESS BAR
// ============================================================================

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className="bg-[#ed6437] h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Upload progress: ${progress}%`}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UniversalMediaUploadModal({
  isOpen,
  onClose,
  uploadContext,
  title = 'Upload Media',
  onUploadComplete,
  acceptedFormats = 'image/jpeg,image/png,image/gif,image/webp',
  maxFileSizeMB = 10,
  allowedCropPresets,
  defaultCropPreset = 'square',
}: UniversalMediaUploadModalProps) {

  // SEO fields state — lives here so the form persists across sub-modal opens
  const [seoFields, setSeoFields] = useState<SEOFields>({ altText: '', titleText: '' });

  const {
    flowState,
    isCropperOpen,
    handleFileSelect,
    handleClearFile,
    handleOpenCropper,
    handleCropApplied,
    handleCropCancelled,
    handleUpload,
    handleReset,
  } = useMediaUploadModal({
    uploadContext,
    onUploadComplete,
    isOpen,
  });

  // Reset SEO fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSeoFields({ altText: '', titleText: '' });
    }
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // Cropper image source: use original file preview URL
  // --------------------------------------------------------------------------

  const cropperImageUrl = flowState.previewUrl ?? '';

  // --------------------------------------------------------------------------
  // Handle crop apply from EnhancedImageCropperModal
  // --------------------------------------------------------------------------

  const handleCropAppliedWrapper = useCallback(
    (croppedDataUrl: string, metadata: CropMetadata) => {
      handleCropApplied(croppedDataUrl, metadata);
    },
    [handleCropApplied]
  );

  // --------------------------------------------------------------------------
  // Upload trigger
  // --------------------------------------------------------------------------

  const handleUploadClick = useCallback(async () => {
    await handleUpload(seoFields);
  }, [handleUpload, seoFields]);

  // --------------------------------------------------------------------------
  // Derived booleans
  // --------------------------------------------------------------------------

  const { step, croppedDataUrl, uploadProgress, errorMessage } = flowState;
  const hasFile = step !== 'idle';
  const isUploading = step === 'uploading';
  const isComplete = step === 'complete';
  const isError = step === 'error';
  const canUpload = hasFile && !isUploading && !isComplete && seoFields.altText.trim().length > 0;
  const skipCropper = uploadContext.skipCropper === true;
  const previewToShow = croppedDataUrl ?? flowState.previewUrl;

  // --------------------------------------------------------------------------
  // Footer buttons
  // --------------------------------------------------------------------------

  const renderFooter = () => {
    if (isComplete) {
      return (
        <div className="flex justify-end">
          <BizModalButton variant="primary" onClick={onClose}>
            Done
          </BizModalButton>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex justify-between gap-3">
          <BizModalButton variant="secondary" onClick={handleReset}>
            Try Again
          </BizModalButton>
          <BizModalButton variant="secondary" onClick={onClose}>
            Cancel
          </BizModalButton>
        </div>
      );
    }

    return (
      <div className="flex justify-between gap-3">
        <BizModalButton variant="secondary" onClick={onClose} disabled={isUploading}>
          Cancel
        </BizModalButton>
        <div className="flex gap-2">
          {hasFile && !isUploading && !skipCropper && (
            <BizModalButton
              variant="secondary"
              onClick={handleOpenCropper}
              disabled={!flowState.previewUrl}
            >
              Crop Image
            </BizModalButton>
          )}
          <BizModalButton
            variant="primary"
            onClick={handleUploadClick}
            disabled={!canUpload}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </BizModalButton>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Body content
  // --------------------------------------------------------------------------

  const renderBody = () => {
    // Complete state
    if (isComplete) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <CheckCircleIcon />
          <p className="text-lg font-semibold text-gray-800">Upload complete!</p>
          <p className="text-sm text-gray-500">Your media has been saved successfully.</p>
        </div>
      );
    }

    // Error state
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircleIcon />
          <p className="text-lg font-semibold text-gray-800">Upload failed</p>
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      );
    }

    // Uploading state
    if (isUploading) {
      return (
        <div className="space-y-4 py-4">
          <p className="text-sm text-center text-gray-600">Uploading your file...</p>
          <ProgressBar progress={uploadProgress} />
          <p className="text-xs text-center text-gray-400">{uploadProgress}%</p>
        </div>
      );
    }

    // Main upload form (idle or file-selected)
    return (
      <div className="space-y-5">
        {/* Drop zone */}
        <UploadDropZone
          onFileSelect={handleFileSelect}
          acceptedFormats={acceptedFormats}
          maxFileSizeMB={maxFileSizeMB}
          currentPreview={previewToShow}
          onClear={handleClearFile}
          disabled={isUploading}
        />

        {/* Crop applied indicator */}
        {croppedDataUrl && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            Cropped image will be uploaded. Click &ldquo;Crop Image&rdquo; to adjust.
          </p>
        )}

        {/* SEO fields — shown after file selected */}
        {hasFile && (
          <SEOFieldsForm
            values={seoFields}
            onChange={setSeoFields}
            disabled={isUploading}
          />
        )}

        {/* Feature tips — always shown */}
        <FeatureTipsPanel mediaType={uploadContext.mediaType} />
      </div>
    );
  };

  return (
    <>
      <BizModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        maxWidth="lg"
        closeOnBackdropClick={false}
        footer={renderFooter()}
      >
        {renderBody()}
      </BizModal>

      {/* Cropper sub-modal — rendered outside main modal to avoid z-index stacking issues */}
      {flowState.previewUrl && !skipCropper && (
        <EnhancedImageCropperModal
          isOpen={isCropperOpen}
          onClose={handleCropCancelled}
          onApply={handleCropAppliedWrapper}
          imageUrl={cropperImageUrl}
          allowedPresets={allowedCropPresets}
          defaultPreset={defaultCropPreset}
        />
      )}
    </>
  );
}
