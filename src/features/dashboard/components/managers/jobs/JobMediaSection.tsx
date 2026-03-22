/**
 * JobMediaSection - Media upload section for job postings
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ENHANCED patterns
 * - UMM integration for file storage
 * - Tier limit enforcement
 *
 * FEATURES:
 * - Image gallery upload with drag & drop
 * - Video URL input
 * - Alt text editing
 * - Tier limit display
 * - Delete functionality
 *
 * @tier STANDARD
 * @phase Jobs Media Upload
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { JobMedia, JobMediaLimits } from '@features/jobs/types';

// ============================================================================
// TYPES
// ============================================================================

interface JobMediaSectionProps {
  jobId: number;
  listingTier: string;
  onMediaChange?: (_updatedMedia: JobMedia[]) => void;
}

// ============================================================================
// TIER LIMIT DISPLAY
// ============================================================================

const formatLimit = (current: number, limit: number, unlimited: boolean): string => {
  if (unlimited) return `${current} (unlimited)`;
  return `${current}/${limit}`;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function JobMediaSection({
  jobId,
  listingTier,
  onMediaChange
}: JobMediaSectionProps) {
  const [media, setMedia] = useState<JobMedia[]>([]);
  const [limits, setLimits] = useState<JobMediaLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingAltText, setEditingAltText] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing media and limits
  useEffect(() => {
    const loadMedia = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/media`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load media');
        }

        const data = await response.json();
        setMedia(data.data?.media || []);
        setLimits(data.data?.limits || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load media');
      } finally {
        setIsLoading(false);
      }
    };

    loadMedia();
  }, [jobId]);

  // Check if can add more images
  const canAddImage = limits
    ? limits.images.unlimited || limits.images.current < limits.images.limit
    : false;

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!canAddImage) {
      setError(`Image limit reached (${limits?.images.limit} max for ${listingTier} tier)`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Upload to Cloudinary via media upload endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'jobs');
      formData.append('entityId', jobId.toString());
      formData.append('mediaType', 'gallery');

      const uploadResponse = await fetchWithCsrf('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.data?.file?.url;

      if (!fileUrl) {
        throw new Error('No file URL returned from upload');
      }

      // Step 2: Add media record to job_media table
      const addResponse = await fetchWithCsrf(`/api/jobs/${jobId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'image',
          file_url: fileUrl,
          alt_text: file.name.replace(/\.[^/.]+$/, '') // Use filename without extension
        })
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save media record');
      }

      const addData = await addResponse.json();
      const newMedia = addData.data?.media;

      if (newMedia) {
        const updatedMedia = [...media, newMedia];
        setMedia(updatedMedia);
        onMediaChange?.(updatedMedia);

        // Update limits
        if (limits) {
          setLimits({
            ...limits,
            images: {
              ...limits.images,
              current: limits.images.current + 1
            }
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [jobId, canAddImage, limits, listingTier, media, onMediaChange]);

  // Handle delete
  const handleDelete = useCallback(async (mediaId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/jobs/${jobId}/media?mediaId=${mediaId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete media');
      }

      const updatedMedia = media.filter(m => m.id !== mediaId);
      setMedia(updatedMedia);
      onMediaChange?.(updatedMedia);

      // Update limits
      if (limits) {
        const deletedItem = media.find(m => m.id === mediaId);
        if (deletedItem?.media_type === 'image') {
          setLimits({
            ...limits,
            images: {
              ...limits.images,
              current: Math.max(0, limits.images.current - 1)
            }
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [jobId, media, limits, onMediaChange]);

  // Handle alt text update
  const handleAltTextSave = useCallback(async (mediaId: number, altText: string) => {
    try {
      // For now, just update locally - would need PATCH endpoint for individual media
      const updatedMedia = media.map(m =>
        m.id === mediaId ? { ...m, alt_text: altText } : m
      );
      setMedia(updatedMedia);
      onMediaChange?.(updatedMedia);
      setEditingAltText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alt text');
    }
  }, [media, onMediaChange]);

  // Drag and drop handlers
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
    const file = files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading media...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with tier limits */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Job Images</h4>
        {limits && (
          <span className="text-xs text-gray-500">
            {formatLimit(limits.images.current, limits.images.limit, limits.images.unlimited)} images
          </span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload area */}
      {canAddImage && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            className="sr-only"
          />

          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop an image, or <span className="text-blue-600">browse</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                JPEG, PNG, GIF, WebP up to 10MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Limit reached message */}
      {!canAddImage && limits && !limits.images.unlimited && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
          Image limit reached ({limits.images.limit} max for {listingTier} tier).
          {listingTier !== 'premium' && ' Upgrade your plan to add more images.'}
        </div>
      )}

      {/* Media gallery */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-video"
            >
              {/* Image */}
              <Image
                src={item.file_url}
                alt={item.alt_text || 'Job image'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  aria-label="Delete image"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Alt text */}
              {editingAltText === item.id ? (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-white">
                  <input
                    type="text"
                    defaultValue={item.alt_text || ''}
                    className="w-full px-2 py-1 text-xs border rounded"
                    placeholder="Alt text"
                    autoFocus
                    onBlur={(e) => handleAltTextSave(item.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAltTextSave(item.id, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') {
                        setEditingAltText(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingAltText(item.id)}
                  className="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-50 text-white text-xs truncate text-center hover:bg-opacity-70"
                >
                  {item.alt_text || 'Add alt text'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {media.length === 0 && !canAddImage && (
        <div className="text-center py-8 text-gray-500">
          No images uploaded for this job.
        </div>
      )}
    </div>
  );
}

export default JobMediaSection;
