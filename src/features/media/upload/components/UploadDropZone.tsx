'use client';

/**
 * UploadDropZone - Drag-and-drop file upload area
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Pattern: follows ImageUploadArea canonical drag-drop pattern.
 * States: default | dragging | file-selected (preview) | error | disabled
 * Accessibility: role="button", tabIndex, aria-label, Enter/Space keyboard support
 */

import { useCallback, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface UploadDropZoneProps {
  /** Called with validated File when user selects or drops a file */
  onFileSelect: (_file: File) => void;
  /** Comma-separated MIME types accepted (e.g. "image/jpeg,image/png") */
  acceptedFormats?: string;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
  /** URL or data URL for current preview image */
  currentPreview?: string | null;
  /** Called when user clears the current preview */
  onClear?: () => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

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

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UploadDropZone({
  onFileSelect,
  acceptedFormats = 'image/jpeg,image/png,image/gif,image/webp',
  maxFileSizeMB = 10,
  currentPreview,
  onClear,
  disabled = false,
  className = '',
}: UploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      const acceptedTypes = acceptedFormats.split(',').map((t) => t.trim());
      if (!acceptedTypes.includes(file.type)) {
        setError(`Unsupported file type. Accepted: ${acceptedTypes.join(', ')}`);
        return false;
      }

      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSizeMB) {
        setError(`File too large. Maximum size is ${maxFileSizeMB}MB.`);
        return false;
      }

      return true;
    },
    [acceptedFormats, maxFileSizeMB]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  // --------------------------------------------------------------------------
  // Drag events
  // --------------------------------------------------------------------------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

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

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  // --------------------------------------------------------------------------
  // Click / keyboard
  // --------------------------------------------------------------------------

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------

  const formatHint = acceptedFormats
    .split(',')
    .map((t) => t.trim().replace('image/', '').replace('video/', '').toUpperCase())
    .join(', ');

  // --------------------------------------------------------------------------
  // Preview state
  // --------------------------------------------------------------------------

  if (currentPreview) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="relative group">
          <div className="overflow-hidden border-2 border-gray-200 rounded-lg bg-gray-50 h-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- Upload preview: uses blob/data URL from file input */}
            <img
              src={currentPreview}
              alt="Upload preview"
              className="w-full h-full object-contain"
            />
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              aria-label="Remove selected file"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Drop zone state
  // --------------------------------------------------------------------------

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload file — drag and drop or click to browse"
        aria-disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'relative border-2 border-dashed rounded-lg h-[200px]',
          'flex flex-col items-center justify-center p-4 transition-colors',
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : isDragging
            ? 'border-blue-400 bg-blue-50 cursor-copy'
            : error
            ? 'border-red-400 bg-red-50 cursor-pointer hover:border-red-500'
            : 'border-gray-300 bg-white cursor-pointer hover:border-[#ed6437] hover:bg-orange-50',
        ].join(' ')}
      >
        <UploadCloudIcon
          className={[
            'w-10 h-10 mb-2',
            isDragging ? 'text-blue-500' : error ? 'text-red-400' : 'text-gray-400',
          ].join(' ')}
        />

        <p className="text-sm text-gray-600 mb-3 text-center">
          {isDragging ? 'Drop file here' : 'Drag and drop your file here, or'}
        </p>

        {!isDragging && (
          <span className="inline-flex items-center px-4 py-2 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-[#d55a30] transition-colors">
            Browse files
          </span>
        )}

        <p className="text-xs text-gray-500 mt-3">
          {formatHint} up to {maxFileSizeMB}MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
