/**
 * GalleryGrid - Image Grid with Drag-and-Drop Reordering and Multi-Select
 *
 * @description Grid display of gallery images with DnD reorder, multi-select,
 *   context menu, batch operations bar, and SEO metadata display.
 * @component Client Component
 * @tier ADVANCED
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - DndContext + SortableContext from @dnd-kit
 * - Orange theme (#ed6437)
 */
'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SortableGalleryCard } from './SortableGalleryCard';
import { GalleryImageContextMenu } from './GalleryImageContextMenu';
import { GalleryBatchBar } from './GalleryBatchBar';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryGridProps {
  /** Array of image URLs */
  images: string[];
  /** Single delete callback */
  // eslint-disable-next-line no-unused-vars
  onDelete: (url: string) => void;
  /** Batch delete callback */
  // eslint-disable-next-line no-unused-vars
  onDeleteBatch: (urls: string[]) => void;
  /** Reorder callback */
  // eslint-disable-next-line no-unused-vars
  onReorder: (reorderedUrls: string[]) => void;
  /** Edit (crop) callback */
  // eslint-disable-next-line no-unused-vars
  onEditImage: (url: string) => void;
  /** SEO edit callback */
  // eslint-disable-next-line no-unused-vars
  onEditSEO: (urls: string[]) => void;
  /** Whether update is in progress */
  isUpdating: boolean;
  /** Optional metadata map keyed by URL */
  imageMetadata?: Map<string, { altText?: string; titleText?: string }>;
}

interface ContextMenuState {
  url: string;
  x: number;
  y: number;
}

// ============================================================================
// INNER COMPONENT
// ============================================================================

function GalleryGridInner({
  images,
  onDelete,
  onDeleteBatch,
  onReorder,
  onEditImage,
  onEditSEO,
  isUpdating,
  imageMetadata,
}: GalleryGridProps) {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Track last-clicked index for Shift+click range selection
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  // Copy feedback toast
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // ---- DnD sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ---- DnD drag end ----
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(images, oldIndex, newIndex);
      onReorder(reordered);
    },
    [images, onReorder]
  );

  // ---- Selection handlers ----
  const handleToggleSelect = useCallback(
    (url: string, index?: number, shiftKey?: boolean) => {
      setSelectedUrls((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastClickedIndex !== null && index !== undefined) {
          // Shift+click: select range
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);
          for (let i = start; i <= end; i++) {
            const rangeUrl = images[i];
            if (rangeUrl) next.add(rangeUrl);
          }
        } else {
          if (next.has(url)) {
            next.delete(url);
          } else {
            next.add(url);
          }
        }

        return next;
      });

      if (index !== undefined) {
        setLastClickedIndex(index);
      }
    },
    [images, lastClickedIndex]
  );

  const handleToggleSelectCard = useCallback(
    (url: string) => {
      const index = images.indexOf(url);
      handleToggleSelect(url, index);
    },
    [images, handleToggleSelect]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedUrls(new Set(images));
  }, [images]);

  const handleClearSelection = useCallback(() => {
    setSelectedUrls(new Set());
    setLastClickedIndex(null);
  }, []);

  // ---- Context menu handlers ----
  const handleContextMenu = useCallback((url: string, x: number, y: number) => {
    setContextMenu({ url, x, y });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextSetFeatured = useCallback(
    (url: string) => {
      const index = images.indexOf(url);
      if (index <= 0) return;
      const reordered = [url, ...images.filter((u) => u !== url)];
      onReorder(reordered);
      setContextMenu(null);
    },
    [images, onReorder]
  );

  const handleContextEdit = useCallback(
    (url: string) => {
      onEditImage(url);
      setContextMenu(null);
    },
    [onEditImage]
  );

  const handleContextEditSEO = useCallback(
    (url: string) => {
      onEditSEO([url]);
      setContextMenu(null);
    },
    [onEditSEO]
  );

  const handleCardEditSEO = useCallback(
    (url: string) => {
      onEditSEO([url]);
    },
    [onEditSEO]
  );

  // Shared clipboard helper with fallback and feedback
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for insecure contexts or missing Clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyToast(label);
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      // Last resort fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyToast(label);
        setTimeout(() => setCopyToast(null), 2000);
      } catch {
        setCopyToast('Copy failed — try manually');
        setTimeout(() => setCopyToast(null), 2000);
      }
    }
  }, []);

  const handleContextCopyUrl = useCallback(
    (url: string) => {
      void copyToClipboard(url, 'URL copied!');
      setContextMenu(null);
    },
    [copyToClipboard]
  );

  const handleContextDelete = useCallback(
    (url: string) => {
      onDelete(url);
      setContextMenu(null);
    },
    [onDelete]
  );

  // ---- Batch handlers ----
  const handleDeleteSelected = useCallback(() => {
    const urls = Array.from(selectedUrls);
    onDeleteBatch(urls);
    setSelectedUrls(new Set());
  }, [selectedUrls, onDeleteBatch]);

  const handleEditSEOSelected = useCallback(() => {
    onEditSEO(Array.from(selectedUrls));
  }, [selectedUrls, onEditSEO]);

  const handleCopyUrlsSelected = useCallback(() => {
    const urls = Array.from(selectedUrls);
    const text = urls.join('\n');
    void copyToClipboard(text, `${urls.length} URL${urls.length > 1 ? 's' : ''} copied!`);
  }, [selectedUrls, copyToClipboard]);

  const hasAnySelected = selectedUrls.size > 0;

  return (
    <div className="relative">
      {/* Select All / Deselect header when items are selected */}
      {hasAnySelected && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="text-sm text-gray-600 font-medium">
            {selectedUrls.size} of {images.length} selected
          </span>
          {selectedUrls.size < images.length ? (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-[#ed6437] hover:underline font-medium"
            >
              Select All
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-sm text-gray-500 hover:underline"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* DnD Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={images} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => {
              const meta = imageMetadata?.get(url);
              return (
                <SortableGalleryCard
                  key={url}
                  url={url}
                  index={index}
                  isSelected={selectedUrls.has(url)}
                  isUpdating={isUpdating}
                  isFeatured={index === 0}
                  altText={meta?.altText}
                  titleText={meta?.titleText}
                  hasAnySelected={hasAnySelected}
                  onToggleSelect={handleToggleSelectCard}
                  onDelete={onDelete}
                  onEdit={onEditImage}
                  onCopyUrl={handleContextCopyUrl}
                  onEditSEO={handleCardEditSEO}
                  onContextMenu={handleContextMenu}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <GalleryImageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          imageUrl={contextMenu.url}
          isFeatured={images.indexOf(contextMenu.url) === 0}
          onClose={handleContextMenuClose}
          onEdit={handleContextEdit}
          onCopyUrl={handleContextCopyUrl}
          onEditSEO={handleContextEditSEO}
          onSetFeatured={handleContextSetFeatured}
          onDelete={handleContextDelete}
        />
      )}

      {/* Batch Bar */}
      <GalleryBatchBar
        selectedCount={selectedUrls.size}
        totalCount={images.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
        onEditSEO={handleEditSEOSelected}
        onCopyUrls={handleCopyUrlsSelected}
      />

      {/* Copy Toast */}
      {copyToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          {copyToast}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT - wrapped with ErrorBoundary
// ============================================================================

export function GalleryGrid(props: GalleryGridProps) {
  return (
    <ErrorBoundary componentName="GalleryGrid">
      <GalleryGridInner {...props} />
    </ErrorBoundary>
  );
}

export default GalleryGrid;
