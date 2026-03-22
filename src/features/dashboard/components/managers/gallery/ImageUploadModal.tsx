/**
 * ImageUploadModal - Batch File Upload Form
 *
 * @description Modal for uploading gallery images via drag-and-drop or file browser.
 *   Files are uploaded to Cloudinary via /api/media/upload sequentially.
 *   Maintains the onSubmit(imageUrls: string[]) contract with GalleryManager.
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Gallery Standardization 8C - Batch Upload Refactor
 * @authority docs/media/galleryformat/phases/3-9-26/images/GALLERY_BATCH_UPLOAD_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - credentials: 'include' on all fetch calls
 * - Blob URL previews cleaned up on unmount
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { X, Loader2 } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageUploadModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Submit callback — receives Cloudinary URLs */
  // eslint-disable-next-line no-unused-vars
  onSubmit: (imageUrls: string[]) => Promise<void>;
  /** Whether form is submitting (external state from parent) */
  isSubmitting: boolean;
  /** Maximum number of images that can be added (remaining tier capacity) */
  maxImages: number;
  /** Listing ID — used for Cloudinary folder path in entityId */
  listingId: number | string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
const ACCEPTED_TYPES_ARRAY = ACCEPTED_TYPES.split(',');
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ============================================================================
// ICONS
// ============================================================================

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ImageUploadModal — drag-and-drop batch file upload for gallery images.
 *
 * Upload flow (sequential per file):
 * 1. User selects/drops files — local blob previews generated
 * 2. On submit: fetch CSRF token, upload each file to /api/media/upload
 * 3. Collect Cloudinary URLs, call onSubmit(urls), close on success
 */
export function ImageUploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  maxImages,
  listingId,
}: ImageUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset all internal state
  const resetState = useCallback(() => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setIsDragging(false);
    setValidationErrors([]);
    setUploadProgress(null);
    setUploadErrors([]);
    setIsUploading(false);
  }, [previews]);

  const handleClose = useCallback(() => {
    if (!isUploading) {
      resetState();
      onClose();
    }
  }, [isUploading, resetState, onClose]);

  // --------------------------------------------------------------------------
  // File validation
  // --------------------------------------------------------------------------

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const errors: string[] = [];
      const valid: File[] = [];

      const remaining = maxImages - selectedFiles.length;

      files.forEach((file) => {
        if (!ACCEPTED_TYPES_ARRAY.includes(file.type)) {
          errors.push(`"${file.name}" is not a supported image type (JPEG, PNG, GIF, WebP only).`);
          return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(`"${file.name}" exceeds the 10MB size limit.`);
          return;
        }
        valid.push(file);
      });

      if (valid.length > remaining) {
        errors.push(`You can only add ${remaining} more image${remaining === 1 ? '' : 's'}. ${valid.length - remaining} file${valid.length - remaining === 1 ? '' : 's'} ignored.`);
        valid.splice(remaining);
      }

      return { valid, errors };
    },
    [maxImages, selectedFiles.length]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const { valid, errors } = validateFiles(files);
      setValidationErrors(errors);

      if (valid.length === 0) return;

      const newPreviews = valid.map((f) => URL.createObjectURL(f));
      setSelectedFiles((prev) => [...prev, ...valid]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [validateFiles]
  );

  // --------------------------------------------------------------------------
  // Remove a selected file
  // --------------------------------------------------------------------------

  const handleRemoveFile = useCallback(
    (index: number) => {
      const previewUrl = previews[index];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      setValidationErrors([]);
    },
    [previews]
  );

  // --------------------------------------------------------------------------
  // Drag events
  // --------------------------------------------------------------------------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [isUploading, addFiles]
  );

  // --------------------------------------------------------------------------
  // Click / keyboard handlers for drop zone
  // --------------------------------------------------------------------------

  const handleDropZoneClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDropZoneClick();
      }
    },
    [handleDropZoneClick]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        addFiles(files);
      }
      // Reset so same files can be re-selected if removed
      e.target.value = '';
    },
    [addFiles]
  );

  // --------------------------------------------------------------------------
  // Upload submit
  // --------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadErrors([]);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const csrfToken = await fetchCsrfToken();
    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      const file = selectedFiles[i];
      if (!file) continue;

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('entityType', 'listings');
      uploadFormData.append('entityId', String(listingId));
      uploadFormData.append('mediaType', 'gallery');

      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      try {
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: uploadFormData,
        });

        if (response.ok) {
          const result = await response.json();
          const url = result.data?.file?.url;
          if (url) {
            uploadedUrls.push(url as string);
          } else {
            errors.push(`"${file.name}" uploaded but no URL returned.`);
          }
        } else {
          errors.push(`Failed to upload "${file.name}".`);
        }
      } catch {
        errors.push(`Network error uploading "${file.name}".`);
      }
    }

    setUploadProgress(null);
    setUploadErrors(errors);

    if (uploadedUrls.length > 0) {
      await onSubmit(uploadedUrls);
    }

    setIsUploading(false);

    if (errors.length === 0) {
      resetState();
      onClose();
    }
  }, [selectedFiles, isUploading, listingId, onSubmit, resetState, onClose]);

  // --------------------------------------------------------------------------
  // Derived state
  // --------------------------------------------------------------------------

  const canAddMore = selectedFiles.length < maxImages;
  const hasFiles = selectedFiles.length > 0;
  const isDisabled = isUploading || isSubmitting;

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Images"
      maxWidth="lg"
    >
      <div className="space-y-5">

        {/* Drop zone — only show when more files can be added */}
        {canAddMore && (
          <div
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            aria-label="Upload images — drag and drop or click to browse"
            aria-disabled={isDisabled}
            onClick={handleDropZoneClick}
            onKeyDown={handleDropZoneKeyDown}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              'relative border-2 border-dashed rounded-lg h-44',
              'flex flex-col items-center justify-center p-4 transition-colors',
              isDisabled
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : isDragging
                ? 'border-[#ed6437] bg-orange-50 cursor-copy'
                : 'border-gray-300 bg-white cursor-pointer hover:border-[#ed6437] hover:bg-orange-50',
            ].join(' ')}
          >
            <UploadCloudIcon
              className={[
                'w-10 h-10 mb-2',
                isDragging ? 'text-[#ed6437]' : 'text-gray-400',
              ].join(' ')}
            />

            <p className="text-sm text-gray-600 mb-3 text-center">
              {isDragging
                ? 'Drop images here'
                : 'Drag and drop images here, or'}
            </p>

            {!isDragging && (
              <span className="inline-flex items-center px-4 py-2 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-[#d55a30] transition-colors pointer-events-none">
                Browse files
              </span>
            )}

            <p className="text-xs text-gray-500 mt-3">
              JPEG, PNG, GIF, WebP — up to {MAX_FILE_SIZE_MB}MB per file
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              aria-hidden="true"
              disabled={isDisabled}
            />
          </div>
        )}

        {/* File count indicator */}
        {hasFiles && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">{selectedFiles.length}</span> of{' '}
            <span className="font-medium">{maxImages}</span> image
            {maxImages === 1 ? '' : 's'} selected
          </p>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1" role="alert">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-700">
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Preview grid */}
        {hasFiles && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group aspect-square">
                <div className="w-full h-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Blob URL from local file input */}
                  <img
                    src={previews[index]}
                    alt={`Preview of ${file.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={isDisabled}
                  aria-label={`Remove ${file.name}`}
                  className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:cursor-not-allowed hover:bg-red-700"
                >
                  <X className="w-3 h-3" />
                </button>
                <p
                  className="mt-1 text-xs text-gray-500 truncate"
                  title={file.name}
                >
                  {file.name}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress && (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 font-medium">
              Uploading {uploadProgress.current} of {uploadProgress.total}...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#ed6437] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                }}
                role="progressbar"
                aria-valuenow={uploadProgress.current}
                aria-valuemin={0}
                aria-valuemax={uploadProgress.total}
                aria-label="Upload progress"
              />
            </div>
          </div>
        )}

        {/* Upload errors from previous attempt */}
        {uploadErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1" role="alert">
            <p className="text-sm font-medium text-red-800 mb-1">
              Some files failed to upload:
            </p>
            {uploadErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-700">
                {err}
              </p>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDisabled}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled || !hasFiles}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading
              ? `Uploading${uploadProgress ? ` ${uploadProgress.current}/${uploadProgress.total}` : ''}...`
              : `Upload Image${selectedFiles.length === 1 ? '' : 's'}${hasFiles ? ` (${selectedFiles.length})` : ''}`}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default ImageUploadModal;
