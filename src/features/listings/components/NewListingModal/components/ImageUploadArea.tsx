/**
 * ImageUploadArea - Drag-and-Drop Upload Component
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 5 - Section 5 Media
 *
 * FEATURES:
 * - Drag-and-drop file upload
 * - Click to browse file picker
 * - Image preview
 * - Remove image functionality
 * - Accessibility (role="button", aria-label, keyboard support)
 */

'use client';

import { useCallback, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ImageUploadAreaProps {
  label: string;
  currentImage?: string | null;
  onImageSelect: (file: File) => void;
  onRemove: () => void;
  acceptedFormats?: string;
  maxSizeMB?: number;
  context: 'logo' | 'cover';
  /** Size specifications shown in header (right-aligned) */
  sizeSpecs?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ImageUploadArea({
  label,
  currentImage,
  onImageSelect,
  onRemove,
  acceptedFormats = 'image/jpeg,image/png,image/gif,image/webp',
  maxSizeMB = 10,
  context,
  sizeSpecs
}: ImageUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file validation
  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    // Check file type
    const acceptedTypes = acceptedFormats.split(',');
    if (!acceptedTypes.includes(file.type)) {
      setError(`Please upload a valid image (${acceptedTypes.join(', ')})`);
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  }, [acceptedFormats, maxSizeMB]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (validateFile(file)) {
      onImageSelect(file);
    }
  }, [validateFile, onImageSelect]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    const file = files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle click to open file picker
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle keyboard support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Icons based on context
  const CloudUploadIcon = () => (
    <svg
      className={`w-10 h-10 mb-2 ${isDragging ? 'text-[#ed6437]' : 'text-gray-400'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );

  const LandscapeIcon = () => (
    <svg
      className={`w-10 h-10 mb-2 ${isDragging ? 'text-[#ed6437]' : 'text-gray-400'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );

  const dragDropText = context === 'logo'
    ? 'Drag and drop your logo here, or'
    : 'Drag and drop your cover image here, or';

  const buttonText = context === 'logo'
    ? 'Click to upload logo'
    : 'Click to upload cover image';

  return (
    <div className="space-y-2">
      {/* Header with label and size specs */}
      <div className="flex items-start justify-between">
        <label className="text-sm font-semibold text-[#022641]">
          {label}
        </label>
        {sizeSpecs && (
          <span className="text-xs text-gray-500 text-right whitespace-pre-line leading-tight">
            {sizeSpecs}
          </span>
        )}
      </div>

      {currentImage ? (
        // Image preview with remove button
        <div className="relative group">
          <div className="overflow-hidden border-2 border-gray-200 rounded-lg bg-gray-50 h-[180px]">
            <img
              src={currentImage}
              alt={label}
              className="w-full h-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove ${label}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Upload area - matching design intent (same height for both)
        <div
          role="button"
          tabIndex={0}
          aria-label={`Upload ${label}`}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer
            border-2 border-dashed rounded-lg
            h-[180px]
            ${isDragging
              ? 'border-[#ed6437] bg-orange-50'
              : 'border-gray-300 bg-white hover:border-[#ed6437] hover:bg-orange-50'
            }
            transition-colors
            flex flex-col items-center justify-center
            p-4
          `}
        >
          {/* Context-specific icon */}
          {context === 'logo' ? <CloudUploadIcon /> : <LandscapeIcon />}

          {/* Drag and drop text */}
          <p className="text-sm text-gray-600 mb-3 text-center">
            {isDragging ? 'Drop image here' : dragDropText}
          </p>

          {/* Orange upload button */}
          <span className="inline-flex items-center px-4 py-2 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-[#d55a30] transition-colors">
            {buttonText}
          </span>

          {/* File format hint */}
          <p className="text-xs text-gray-500 mt-3">
            PNG, JPG, GIF, WebP up to {maxSizeMB}MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleFileInputChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
