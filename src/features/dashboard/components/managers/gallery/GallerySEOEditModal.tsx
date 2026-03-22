/**
 * GallerySEOEditModal - SEO metadata editor for gallery images
 *
 * @description Spreadsheet-style SEO editor adapted from BulkSEOEditModal.
 *   Works with image URLs instead of DirectoryEntry objects.
 *   Thumbnail column shows actual gallery images.
 * @component Client Component
 * @tier ADVANCED
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Change tracking with Map keyed by URL
 * - BizModalWithReset key pattern for state reset on open
 * - Orange theme (#ed6437) for save button
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { SEOHealthBadge } from '@features/media/admin/components/SEOHealthBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImageSEOItem {
  url: string;
  altText?: string;
  titleText?: string;
}

export interface GallerySEOEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GalleryImageSEOItem[];
  // eslint-disable-next-line no-unused-vars
  onSave: (updates: Array<{ url: string; altText: string; titleText: string }>) => Promise<void>;
  isSaving?: boolean;
}

interface SEOEditState {
  altText: string;
  titleText: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildInitialState(images: GalleryImageSEOItem[]): Map<string, SEOEditState> {
  const map = new Map<string, SEOEditState>();
  for (const image of images) {
    map.set(image.url, {
      altText: image.altText ?? '',
      titleText: image.titleText ?? '',
    });
  }
  return map;
}

function getFilenameFromUrl(url: string): string {
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    return last ? decodeURIComponent(last.split('?')[0] ?? last) : url;
  } catch {
    return url;
  }
}

// ============================================================================
// INNER COMPONENT
// ============================================================================

function GallerySEOEditModalInner({
  isOpen,
  onClose,
  images,
  onSave,
  isSaving = false,
}: GallerySEOEditModalProps) {
  const [edits, setEdits] = useState<Map<string, SEOEditState>>(() => buildInitialState(images));

  // Track which URLs have been modified from their original values
  const changedUrls = useMemo(() => {
    const changed = new Set<string>();
    for (const image of images) {
      const edit = edits.get(image.url);
      if (!edit) continue;
      const origAlt = image.altText ?? '';
      const origTitle = image.titleText ?? '';
      if (edit.altText !== origAlt || edit.titleText !== origTitle) {
        changed.add(image.url);
      }
    }
    return changed;
  }, [edits, images]);

  const handleAltChange = useCallback((url: string, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(url) ?? { altText: '', titleText: '' };
      next.set(url, { ...current, altText: value });
      return next;
    });
  }, []);

  const handleTitleChange = useCallback((url: string, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(url) ?? { altText: '', titleText: '' };
      next.set(url, { ...current, titleText: value });
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (changedUrls.size === 0 || isSaving) return;

    const updates = Array.from(changedUrls).map((url) => {
      const edit = edits.get(url) ?? { altText: '', titleText: '' };
      return {
        url,
        altText: edit.altText,
        titleText: edit.titleText,
      };
    });

    await onSave(updates);
  }, [changedUrls, edits, isSaving, onSave]);

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  const title = `Edit SEO Metadata (${images.length} ${images.length === 1 ? 'image' : 'images'})`;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="lg"
      closeOnBackdropClick={!isSaving}
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">
            {changedUrls.size > 0 ? (
              <span className="text-orange-600 font-medium">
                {changedUrls.size} change{changedUrls.size !== 1 ? 's' : ''}
              </span>
            ) : (
              'No changes'
            )}
          </span>
          <div className="flex gap-3">
            <BizModalButton
              variant="secondary"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={() => void handleSave()}
              disabled={changedUrls.size === 0 || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </BizModalButton>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Edit alt text and title for each image. Changed rows are highlighted.
          Tab between fields to navigate.
        </p>

        {images.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No images to edit
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="w-10 px-2 py-2" aria-label="Thumbnail" />
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Image
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Alt Text
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Title
                  </th>
                </tr>
              </thead>
              <tbody>
                {images.map((image) => {
                  const edit = edits.get(image.url) ?? { altText: '', titleText: '' };
                  const isChanged = changedUrls.has(image.url);
                  const filename = getFilenameFromUrl(image.url);

                  return (
                    <tr
                      key={image.url}
                      className={[
                        'border-b border-gray-100 transition-colors',
                        isChanged ? 'bg-yellow-50' : 'hover:bg-gray-50',
                      ].join(' ')}
                    >
                      {/* Thumbnail */}
                      <td className="w-10 px-2 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Gallery thumbnail preview: external Cloudinary URL */}
                        <img
                          src={image.url}
                          alt={edit.altText || filename}
                          className="w-8 h-8 object-cover rounded border border-gray-200"
                          loading="lazy"
                        />
                      </td>

                      {/* Filename + SEO badge */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <SEOHealthBadge
                            altText={edit.altText}
                            titleText={edit.titleText}
                            size="sm"
                          />
                          <span
                            className="text-xs text-gray-700 truncate max-w-[120px]"
                            title={filename}
                          >
                            {filename}
                          </span>
                        </div>
                      </td>

                      {/* Alt Text input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={edit.altText}
                          onChange={(e) => handleAltChange(image.url, e.target.value)}
                          placeholder="Describe the image..."
                          maxLength={255}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          aria-label={`Alt text for image ${filename}`}
                        />
                      </td>

                      {/* Title input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={edit.titleText}
                          onChange={(e) => handleTitleChange(image.url, e.target.value)}
                          placeholder="Image title..."
                          maxLength={60}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                          aria-label={`Title for image ${filename}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BizModal>
  );
}

// ============================================================================
// EXPORTED COMPONENT - uses key pattern to reset state on open/close
// ============================================================================

export function GallerySEOEditModal(props: GallerySEOEditModalProps) {
  return (
    <GallerySEOEditModalInner
      key={props.isOpen ? `open-${props.images.length}` : 'closed'}
      {...props}
    />
  );
}

export default GallerySEOEditModal;
