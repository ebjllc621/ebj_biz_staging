/**
 * FeatureMediaView - Per-Feature Media Management View
 *
 * Displays and manages media for a single feature:
 * - Gallery: image grid with drag-reorder, upload, delete, SEO edit
 * - Logo / Cover: single large preview with replace / delete
 * - Video Gallery: list of video embed URLs (URL input)
 * - Attachments: table with file info, delete
 *
 * Sub-modals:
 * - UniversalMediaUploadModal (Phase 2 upload)
 * - ImageSEOEditModal (per-item SEO)
 * - ConfirmDeleteModal (delete confirmation)
 *
 * @tier ADVANCED
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { ArrowLeft, Upload, Plus, AlertCircle, Loader2, Trash2, Edit3, Link, Image as ImageIcon, Paperclip } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TierLimitBanner } from '@features/dashboard/components/shared/TierLimitBanner';
import { ConfirmDeleteModal } from '@features/dashboard/components/shared/ConfirmDeleteModal';
import { EmptyState } from '@features/dashboard/components/shared/EmptyState';
import { SEOHealthBadge } from '@features/media/admin/components/SEOHealthBadge';
import UniversalMediaUploadModal from '@features/media/upload/components/UniversalMediaUploadModal';
import { ImageSEOEditModal } from './ImageSEOEditModal';
import type { FeatureConfig, FeatureMediaItem } from '../types/media-manager-lite-types';
import type { MediaUploadResult } from '@features/media/upload/types/upload-types';
import type { ListingAttachmentRow } from '@core/types/db-rows';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureMediaViewProps {
  config: FeatureConfig;
  items: FeatureMediaItem[];
  attachments?: ListingAttachmentRow[];
  isLoading: boolean;
  currentCount: number;
  maxCount: number;
  tier: string;
  listingId: number;
  listingName?: string;
  onBack: () => void;
  onAddMedia: (_url: string) => Promise<void>;
  onRemoveMedia: (_itemId: string | number) => Promise<void>;
  onReorderMedia?: (_orderedIds: (string | number)[]) => Promise<void>;
  onReplaceMedia?: (_url: string) => Promise<void>;
  onDeleteAttachment?: (_attachmentId: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  updateMediaSEO?: (_mediaFileId: number, _altText: string, _titleText: string) => Promise<boolean>;
  isUpdating: boolean;
  updateError: string | null;
  clearUpdateError: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Image grid item card */
function ImageGridItem({
  item,
  onDelete,
  onEditSEO,
  disabled
}: {
  item: FeatureMediaItem;
  onDelete: (_item: FeatureMediaItem) => void;
  onEditSEO: (_item: FeatureMediaItem) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.altText ?? item.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onEditSEO(item)}
          disabled={disabled}
          className="p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors"
          title="Edit SEO"
          aria-label={`Edit SEO for ${item.name}`}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={disabled}
          className="p-1.5 bg-red-500/90 rounded-full text-white hover:bg-red-600 transition-colors"
          title="Delete"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SEO dot */}
      <div className="absolute bottom-1 right-1">
        <SEOHealthBadge altText={item.altText} titleText={item.titleText} size="sm" />
      </div>
    </div>
  );
}

/** Video URL list item */
function VideoListItem({
  item,
  onDelete,
  disabled
}: {
  item: FeatureMediaItem;
  onDelete: (_item: FeatureMediaItem) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <Link className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="flex-1 text-sm text-gray-700 truncate" title={item.url}>
        {item.url}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={disabled}
        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        aria-label={`Delete ${item.url}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Attachment row */
function AttachmentRow({
  attachment,
  onDelete,
  disabled
}: {
  attachment: ListingAttachmentRow;
  onDelete: (_id: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex-shrink-0 w-8 h-8 bg-orange-50 rounded flex items-center justify-center">
        <span className="text-xs font-medium text-[#ed6437]">
          {attachment.file_type?.includes('pdf') ? 'PDF' : 'DOC'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.display_name}
        </p>
        <p className="text-xs text-gray-500">
          {attachment.category} &middot; {formatFileSize(attachment.file_size)} &middot; {attachment.download_count} downloads
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDelete(attachment.id)}
        disabled={disabled}
        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        aria-label={`Delete ${attachment.display_name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function FeatureMediaViewContent({
  config,
  items,
  attachments = [],
  isLoading,
  currentCount,
  maxCount,
  tier,
  listingId,
  listingName,
  onBack,
  onAddMedia,
  onRemoveMedia,
  onReplaceMedia,
  onDeleteAttachment,
  onRefresh,
  updateMediaSEO,
  isUpdating,
  updateError,
  clearUpdateError
}: FeatureMediaViewProps) {
  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);

  // Video URL input state
  const [videoUrl, setVideoUrl] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingItem, setDeletingItem] = useState<FeatureMediaItem | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // SEO edit state
  const [seoEditItem, setSEOEditItem] = useState<FeatureMediaItem | null>(null);
  const [isSavingSEO, setIsSavingSEO] = useState(false);

  const canAddMore = currentCount < maxCount;

  // --------------------------------------------------------------------------
  // UPLOAD COMPLETE
  // --------------------------------------------------------------------------

  const handleUploadComplete = useCallback(async (result: MediaUploadResult) => {
    if (!result.success || !result.previewUrl) return;

    try {
      if (config.storagePattern === 'single-url' && onReplaceMedia) {
        await onReplaceMedia(result.previewUrl);
      } else {
        await onAddMedia(result.previewUrl);
      }
      setShowUpload(false);
      await onRefresh();
    } catch {
      // Error handled by parent hook
    }
  }, [config.storagePattern, onAddMedia, onReplaceMedia, onRefresh]);

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await onRemoveMedia(deletingItem.id);
      setDeletingItem(null);
      await onRefresh();
    } finally {
      setIsDeleting(false);
    }
  }, [deletingItem, onRemoveMedia, onRefresh]);

  const handleDeleteAttachmentConfirm = useCallback(async () => {
    if (deletingAttachmentId === null || !onDeleteAttachment) return;
    setIsDeleting(true);
    try {
      await onDeleteAttachment(deletingAttachmentId);
      setDeletingAttachmentId(null);
      await onRefresh();
    } finally {
      setIsDeleting(false);
    }
  }, [deletingAttachmentId, onDeleteAttachment, onRefresh]);

  // --------------------------------------------------------------------------
  // VIDEO URL ADD
  // --------------------------------------------------------------------------

  const handleAddVideoUrl = useCallback(async () => {
    const url = videoUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setVideoError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setVideoError(null);
    setIsAddingVideo(true);
    try {
      await onAddMedia(url);
      setVideoUrl('');
      await onRefresh();
    } catch {
      setVideoError('Failed to add video URL');
    } finally {
      setIsAddingVideo(false);
    }
  }, [videoUrl, onAddMedia, onRefresh]);

  // --------------------------------------------------------------------------
  // SEO SAVE
  // --------------------------------------------------------------------------

  const handleSaveSEO = useCallback(async (altText: string, titleText: string) => {
    if (!seoEditItem?.mediaFileId || !updateMediaSEO) {
      setSEOEditItem(null);
      return;
    }
    setIsSavingSEO(true);
    try {
      await updateMediaSEO(seoEditItem.mediaFileId, altText, titleText);
    } catch {
      // Error handled silently — SEO save failure is non-critical
    } finally {
      setIsSavingSEO(false);
      setSEOEditItem(null);
    }
  }, [seoEditItem, updateMediaSEO]);

  // --------------------------------------------------------------------------
  // RENDER: HEADER
  // --------------------------------------------------------------------------

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Back to features"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <h3 className="font-semibold text-gray-900">
          {config.label}{' '}
          <span className="font-normal text-gray-500 text-sm">
            ({currentCount}/{maxCount})
          </span>
        </h3>
      </div>

      {/* Upload button — not shown for video (uses URL input) or attachments (uses upload modal) */}
      {config.key !== 'video-gallery' && config.key !== 'attachments' && canAddMore && (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          disabled={isUpdating}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {config.storagePattern === 'single-url' ? 'Replace' : 'Upload'}
        </button>
      )}

      {/* Upload button for attachments */}
      {config.key === 'attachments' && canAddMore && (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          disabled={isUpdating}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // RENDER: LOADING
  // --------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ERROR
  // --------------------------------------------------------------------------

  const renderError = () => {
    if (!updateError) return null;
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{updateError}</span>
        <button type="button" onClick={clearUpdateError} className="text-red-500 hover:text-red-700 text-xs">
          Dismiss
        </button>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // RENDER: CONTENT BODY
  // --------------------------------------------------------------------------

  const renderBody = () => {
    // GALLERY — image grid
    if (config.key === 'gallery') {
      if (items.length === 0) {
        return (
          <EmptyState
            icon={ImageIcon}
            title="No Gallery Images"
            description="Upload photos to showcase your business"
            action={canAddMore ? { label: 'Upload First Image', onClick: () => setShowUpload(true) } : undefined}
          />
        );
      }
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map(item => (
            <ImageGridItem
              key={String(item.id)}
              item={item}
              onDelete={setDeletingItem}
              onEditSEO={setSEOEditItem}
              disabled={isUpdating}
            />
          ))}
        </div>
      );
    }

    // LOGO / COVER — single image
    if (config.key === 'logo' || config.key === 'cover') {
      if (items.length === 0) {
        return (
          <EmptyState
            icon={Upload}
            title={`No ${config.label}`}
            description={config.description}
            action={{ label: `Upload ${config.label}`, onClick: () => setShowUpload(true) }}
          />
        );
      }
      const item = items[0];
      return (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item!.url}
            alt={item?.altText ?? item?.name ?? config.label}
            className="max-h-64 max-w-full rounded-xl object-contain border border-gray-200 shadow-sm"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => setDeletingItem(item!)}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      );
    }

    // VIDEO GALLERY — URL list
    if (config.key === 'video-gallery') {
      return (
        <div className="space-y-4">
          {/* URL input */}
          {canAddMore && (
            <div className="space-y-2">
              <label htmlFor="video-url-input" className="block text-sm font-medium text-gray-700">
                Add Video URL
              </label>
              <div className="flex gap-2">
                <input
                  id="video-url-input"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                  disabled={isAddingVideo}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddVideoUrl();
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleAddVideoUrl()}
                  disabled={!videoUrl.trim() || isAddingVideo}
                  className="flex items-center gap-1 px-3 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isAddingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
              {videoError && (
                <p className="text-xs text-red-600">{videoError}</p>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              icon={Link}
              title="No Videos"
              description="Add YouTube or Vimeo URLs to embed videos on your listing"
            />
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <VideoListItem
                  key={String(item.id)}
                  item={item}
                  onDelete={setDeletingItem}
                  disabled={isUpdating}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // ATTACHMENTS — file table
    if (config.key === 'attachments') {
      if (attachments.length === 0) {
        return (
          <EmptyState
            icon={Paperclip}
            title="No Attachments"
            description="Upload brochures, menus, and documents for customers to download"
            action={canAddMore ? { label: 'Upload Document', onClick: () => setShowUpload(true) } : undefined}
          />
        );
      }
      return (
        <div className="space-y-2">
          {attachments.map(attachment => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              onDelete={setDeletingAttachmentId}
              disabled={isUpdating}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  // --------------------------------------------------------------------------
  // BUILD UPLOAD CONTEXT
  // --------------------------------------------------------------------------

  const uploadContext = {
    entityType: 'listing' as const,
    entityId: listingId,
    mediaType: config.mediaType,
    contextName: listingName ?? `Listing ${listingId}`,
    skipCropper: !config.useCropper
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {renderHeader()}

      {/* Tier limit banner */}
      <TierLimitBanner
        current={currentCount}
        limit={maxCount}
        itemType={config.label.toLowerCase()}
        tier={tier}
      />

      {renderError()}

      {renderBody()}

      {/* Upload modal (for image/attachment features) */}
      {config.key !== 'video-gallery' && (
        <UniversalMediaUploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          uploadContext={uploadContext}
          title={`Upload ${config.label}`}
          onUploadComplete={(result) => void handleUploadComplete(result)}
          acceptedFormats={config.acceptedFormats || undefined}
          maxFileSizeMB={config.maxFileSizeMB || undefined}
          defaultCropPreset={config.defaultCropPreset}
        />
      )}

      {/* Delete confirmation — listing column items */}
      {deletingItem && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          onConfirm={() => void handleDeleteConfirm()}
          itemType={config.label.toLowerCase()}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete confirmation — attachments */}
      {deletingAttachmentId !== null && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingAttachmentId(null)}
          onConfirm={() => void handleDeleteAttachmentConfirm()}
          itemType="attachment"
          isDeleting={isDeleting}
        />
      )}

      {/* SEO edit modal */}
      {seoEditItem && (
        <ImageSEOEditModal
          isOpen={true}
          onClose={() => setSEOEditItem(null)}
          imageUrl={seoEditItem.url}
          currentAltText={seoEditItem.altText ?? ''}
          currentTitleText={seoEditItem.titleText ?? ''}
          onSave={handleSaveSEO}
          isSaving={isSavingSEO}
        />
      )}
    </div>
  );
}

/**
 * FeatureMediaView - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export function FeatureMediaView(props: FeatureMediaViewProps) {
  return (
    <ErrorBoundary componentName="FeatureMediaView">
      <FeatureMediaViewContent {...props} />
    </ErrorBoundary>
  );
}

export default FeatureMediaView;
