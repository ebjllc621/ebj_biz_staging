/**
 * MediaUploadSection - Orchestrator component for image upload and video embed.
 * Combines drag-and-drop image upload, video URL input, gallery preview,
 * and tier limit display for Events, Offers, and Jobs creation modals.
 *
 * @authority CLAUDE.md - Build Map v2.1
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 1 - Shared Media Upload Components
 */

'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import ImageCropperModal from '@features/listings/components/NewListingModal/shared/ImageCropper/ImageCropperModal';
import { CROPPER_CONFIGS } from '@features/listings/components/NewListingModal/shared/ImageCropper/cropper-configs';
import VideoEmbedInput from '@features/media/components/VideoEmbedInput';
import { parseVideoUrl } from '@features/media/gallery/utils/video-url-parser';
import type { MediaUploadSectionProps, MediaItem } from '@features/media/types/shared-media';

// ============================================================================
// HELPERS
// ============================================================================

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
const MAX_IMAGE_SIZE_MB = 10;

function formatLimit(current: number, limit: number, unlimited: boolean): string {
  if (unlimited) return `${current} (unlimited)`;
  return `${current}/${limit}`;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const header = arr[0] ?? '';
  const body = arr[1] ?? '';
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? 'image/jpeg';
  const bstr = atob(body);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function MediaUploadSection({
  entityType,
  entityId,
  media,
  limits,
  onMediaChange,
  cropperContext,
  disabled = false,
  label = 'Media',
}: MediaUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // intentionally only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // IMAGE VALIDATION
  // ============================================================================

  const validateImageFile = useCallback((file: File): string | null => {
    const acceptedTypes = ACCEPTED_IMAGE_TYPES.split(',');
    if (!acceptedTypes.includes(file.type)) {
      return `Please upload a valid image (JPEG, PNG, GIF, or WebP)`;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      return `File size must be less than ${MAX_IMAGE_SIZE_MB}MB`;
    }
    return null;
  }, []);

  // ============================================================================
  // UPLOAD (edit mode) OR PENDING (create mode)
  // ============================================================================

  const uploadFile = useCallback(
    async (file: File): Promise<MediaItem | null> => {
      if (!entityId) return null;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId.toString());
      formData.append('mediaType', 'gallery');

      const uploadResponse = await fetchWithCsrf('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.data?.file?.url;

      if (!uploadResponse.ok || !fileUrl) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      // Create media record in entity's media table (event_media, job_media, offer_media)
      const mediaRecordResponse = await fetchWithCsrf(`/api/${entityType}/${entityId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'image',
          file_url: fileUrl,
          alt_text: null,
          source: 'upload',
        }),
      });

      let mediaRecordId: number | string = `temp-${Date.now()}`;
      if (mediaRecordResponse.ok) {
        const mediaRecordData = await mediaRecordResponse.json();
        mediaRecordId = mediaRecordData.data?.media?.id ?? mediaRecordId;
      }

      const newItem: MediaItem = {
        id: mediaRecordId,
        media_type: 'image',
        file_url: fileUrl,
        alt_text: null,
        sort_order: media.length,
        source: 'upload',
      };

      return newItem;
    },
    [entityId, entityType, media.length]
  );

  const addPendingFile = useCallback(
    (file: File, dataUrl: string) => {
      const previewUrl = dataUrl.startsWith('data:')
        ? dataUrl
        : URL.createObjectURL(file);

      const tempId = `pending-${Date.now()}-${Math.random()}`;
      const newItem: MediaItem = {
        id: tempId,
        media_type: 'image',
        file_url: previewUrl,
        alt_text: null,
        sort_order: media.length + pendingFiles.length,
        source: 'upload',
      };

      setPendingFiles((prev) => [...prev, file]);
      setPendingPreviews((prev) => [...prev, previewUrl]);
      onMediaChange([...media, newItem]);
    },
    [media, pendingFiles.length, onMediaChange]
  );

  // ============================================================================
  // FILE PROCESSING
  // ============================================================================

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Check image limit
      const imageCount = media.filter((m) => m.media_type === 'image').length;
      if (!limits.images.unlimited && imageCount >= limits.images.limit) {
        setError(`Image limit reached (${limits.images.limit})`);
        return;
      }

      // If cropper context is provided, open the cropper
      if (cropperContext && cropperContext in CROPPER_CONFIGS) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setCropperImage(result);
          setShowCropper(true);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Edit mode: upload immediately
      if (entityId) {
        setIsUploading(true);
        try {
          const newItem = await uploadFile(file);
          if (newItem) {
            onMediaChange([...media, newItem]);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setIsUploading(false);
        }
        return;
      }

      // Create mode: store pending
      const previewUrl = URL.createObjectURL(file);
      addPendingFile(file, previewUrl);
    },
    [
      validateImageFile,
      media,
      limits.images,
      cropperContext,
      entityId,
      uploadFile,
      onMediaChange,
      addPendingFile,
    ]
  );

  // ============================================================================
  // CROPPER APPLY
  // ============================================================================

  const handleCropperApply = useCallback(
    async (croppedDataUrl: string) => {
      setShowCropper(false);
      setCropperImage(null);

      const filename = `cropped-${entityType}-${Date.now()}.jpg`;
      const croppedFile = dataUrlToFile(croppedDataUrl, filename);

      if (entityId) {
        setIsUploading(true);
        try {
          const newItem = await uploadFile(croppedFile);
          if (newItem) {
            onMediaChange([...media, newItem]);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setIsUploading(false);
        }
      } else {
        addPendingFile(croppedFile, croppedDataUrl);
      }
    },
    [entityId, entityType, uploadFile, media, onMediaChange, addPendingFile]
  );

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => processFile(file));
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
      const files = Array.from(e.target.files ?? []);
      files.forEach((file) => processFile(file));
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [processFile]
  );

  // ============================================================================
  // MEDIA DELETE
  // ============================================================================

  const handleDeleteMedia = useCallback(
    (itemId: number | string) => {
      // Revoke blob URLs to prevent memory leaks (only blob: URLs, not Cloudinary)
      const itemToRemove = media.find((m) => m.id === itemId);
      if (itemToRemove && typeof itemToRemove.file_url === 'string' && itemToRemove.file_url.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.file_url);
      }

      const updated = media.filter((m) => m.id !== itemId);
      onMediaChange(updated);
    },
    [media, onMediaChange]
  );

  // ============================================================================
  // VIDEO URLS
  // ============================================================================

  const videoEmbedUrls = media
    .filter((m) => m.media_type === 'video' && m.source === 'embed')
    .map((m) => m.file_url);

  const handleVideoUrlsChange = useCallback(
    async (urls: string[]) => {
      const existingVideos = media.filter(
        (m) => m.media_type === 'video' && m.source === 'embed'
      );
      const nonVideoMedia = media.filter(
        (m) => !(m.media_type === 'video' && m.source === 'embed')
      );

      const existingUrls = new Set(existingVideos.map((m) => m.file_url));
      const newUrls = new Set(urls);

      // Edit mode: persist additions/removals to the entity media API
      if (entityId) {
        // Delete removed videos
        for (const existing of existingVideos) {
          if (!newUrls.has(existing.file_url) && typeof existing.id === 'number') {
            try {
              await fetchWithCsrf(
                `/api/${entityType}/${entityId}/media?mediaId=${existing.id}`,
                { method: 'DELETE' }
              );
            } catch {
              // Non-blocking
            }
          }
        }

        // Add new videos
        const addedItems: MediaItem[] = [];
        for (const url of urls) {
          if (!existingUrls.has(url)) {
            const parsed = parseVideoUrl(url);
            try {
              const response = await fetchWithCsrf(
                `/api/${entityType}/${entityId}/media`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    media_type: 'video',
                    file_url: url,
                    embed_url: parsed.embedUrl,
                    platform: parsed.provider,
                    source: 'embed',
                  }),
                }
              );
              if (response.ok) {
                const data = await response.json();
                addedItems.push({
                  id: data.data?.media?.id ?? `video-embed-${Date.now()}`,
                  media_type: 'video',
                  file_url: url,
                  alt_text: null,
                  sort_order: nonVideoMedia.length + addedItems.length,
                  embed_url: parsed.embedUrl,
                  platform: parsed.provider,
                  source: 'embed',
                });
              }
            } catch {
              // Non-blocking
            }
          }
        }

        // Keep existing videos that weren't removed + add new ones
        const keptVideos = existingVideos.filter((m) => newUrls.has(m.file_url));
        onMediaChange([...nonVideoMedia, ...keptVideos, ...addedItems]);
        return;
      }

      // Create mode: just update local state
      const videoItems: MediaItem[] = urls.map((url, index) => {
        const parsed = parseVideoUrl(url);
        return {
          id: `video-embed-${index}`,
          media_type: 'video',
          file_url: url,
          alt_text: null,
          sort_order: nonVideoMedia.length + index,
          embed_url: parsed.embedUrl,
          platform: parsed.provider,
          source: 'embed',
        };
      });

      onMediaChange([...nonVideoMedia, ...videoItems]);
    },
    [media, onMediaChange, entityId, entityType]
  );

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const imageCount = media.filter((m) => m.media_type === 'image').length;
  const videoCount = media.filter((m) => m.media_type === 'video').length;
  const canAddImages =
    limits.images.unlimited || imageCount < limits.images.limit;

  const cropperContextKey =
    cropperContext && cropperContext in CROPPER_CONFIGS
      ? (cropperContext as keyof typeof CROPPER_CONFIGS)
      : 'cover';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Section label */}
      {label && (
        <h3 className="text-sm font-semibold text-[#022641]">{label}</h3>
      )}

      {/* ── Image Upload Section ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Images</span>
          <span className="text-xs text-gray-500">
            {formatLimit(imageCount, limits.images.limit, limits.images.unlimited)} images
          </span>
        </div>

        {canAddImages && (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Upload images"
            aria-disabled={disabled || isUploading}
            onClick={disabled || isUploading ? undefined : handleClick}
            onKeyDown={disabled || isUploading ? undefined : handleKeyDown}
            onDragEnter={disabled ? undefined : handleDragEnter}
            onDragOver={disabled ? undefined : handleDragOver}
            onDragLeave={disabled ? undefined : handleDragLeave}
            onDrop={disabled ? undefined : handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg h-[180px]
              flex flex-col items-center justify-center p-4
              transition-colors
              ${disabled || isUploading
                ? 'cursor-not-allowed bg-gray-100 border-gray-200'
                : isDragging
                ? 'cursor-pointer border-[#ed6437] bg-orange-50'
                : 'cursor-pointer border-gray-300 bg-white hover:border-[#ed6437] hover:bg-orange-50'
              }
            `}
          >
            {/* Upload icon */}
            <svg
              className={`w-10 h-10 mb-2 ${isDragging ? 'text-[#ed6437]' : 'text-gray-400'}`}
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

            <p className="text-sm text-gray-600 mb-3 text-center">
              {isUploading
                ? 'Uploading...'
                : isDragging
                ? 'Drop images here'
                : 'Drag and drop images here, or'}
            </p>

            {!isUploading && (
              <span className="inline-flex items-center px-4 py-2 bg-[#ed6437] text-white text-sm font-medium rounded-md hover:bg-[#d55a30] transition-colors">
                Click to upload images
              </span>
            )}

            <p className="text-xs text-gray-500 mt-3">
              PNG, JPG, GIF, WebP up to {MAX_IMAGE_SIZE_MB}MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              multiple
              onChange={handleFileInputChange}
              disabled={disabled || isUploading}
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

      {/* ── Gallery Grid ───────────────────────────────────────────── */}
      {media.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-gray-700">Gallery</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.map((item) => (
              <div key={item.id} className="relative group aspect-square">
                {item.media_type === 'image' ? (
                  <img
                    src={item.file_url}
                    alt={item.alt_text ?? ''}
                    className="w-full h-full object-cover rounded-md border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-md border border-gray-200 bg-gray-100">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}

                {/* Delete overlay */}
                <button
                  type="button"
                  onClick={() => handleDeleteMedia(item.id)}
                  disabled={disabled}
                  aria-label="Remove media item"
                  className="
                    absolute inset-0 flex items-center justify-center
                    bg-black bg-opacity-0 group-hover:bg-opacity-40
                    rounded-md transition-all opacity-0 group-hover:opacity-100
                  "
                >
                  <span className="bg-red-600 text-white rounded-full p-1.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Video Embed Section ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Videos</span>
          <span className="text-xs text-gray-500">
            {formatLimit(videoCount, limits.videos.limit, limits.videos.unlimited)} videos
          </span>
        </div>
        <VideoEmbedInput
          videoUrls={videoEmbedUrls}
          maxVideos={limits.videos.unlimited ? 999 : limits.videos.limit}
          onUrlsChange={handleVideoUrlsChange}
          disabled={disabled}
        />
      </div>

      {/* ── ImageCropperModal ──────────────────────────────────────── */}
      {cropperContext && cropperImage && (
        <ImageCropperModal
          isOpen={showCropper}
          onClose={() => {
            setShowCropper(false);
            setCropperImage(null);
          }}
          onApply={handleCropperApply}
          imageUrl={cropperImage}
          context={cropperContextKey}
        />
      )}
    </div>
  );
}
