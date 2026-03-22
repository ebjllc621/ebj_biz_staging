'use client';

/**
 * VideoGrid - Drag-and-drop video grid with multi-select, context menu, and batch bar
 * @tier ADVANCED
 * @phase Video Gallery Manager
 * @theme orange (#ed6437)
 */

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
import { SortableVideoCard } from './SortableVideoCard';
import { VideoContextMenu } from './VideoContextMenu';
import { VideoBatchBar } from './VideoBatchBar';

/* eslint-disable no-unused-vars */
export interface VideoGridProps {
  videos: string[];
  onDelete: (url: string) => void;
  onDeleteBatch: (urls: string[]) => void;
  onReorder: (reorderedUrls: string[]) => void;
  onPlayVideo: (url: string) => void;
  onEditSEO: (urls: string[]) => void;
  isUpdating: boolean;
  videoMetadata?: Map<string, { altText?: string; titleText?: string }>;
  parsedVideos: Map<string, { thumbnailUrl: string | null; provider: string; embedUrl: string | null }>;
}
/* eslint-enable no-unused-vars */

interface ContextMenuState {
  url: string;
  x: number;
  y: number;
}

function VideoGridInner({
  videos,
  onDelete,
  onDeleteBatch,
  onReorder,
  onPlayVideo,
  onEditSEO,
  isUpdating,
  videoMetadata,
  parsedVideos,
}: VideoGridProps) {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  const hasAnySelected = selectedUrls.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = videos.indexOf(active.id as string);
      const newIndex = videos.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(videos, oldIndex, newIndex);
      onReorder(reordered);
    },
    [videos, onReorder]
  );

  const handleToggleSelectCard = useCallback(
    (url: string, index: number, shiftKey: boolean) => {
      setSelectedUrls((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastClickedIndex !== null) {
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);
          const rangeUrls = videos.slice(start, end + 1);
          const allInRange = rangeUrls.every((u) => next.has(u));
          if (allInRange) {
            rangeUrls.forEach((u) => next.delete(u));
          } else {
            rangeUrls.forEach((u) => next.add(u));
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
      setLastClickedIndex(index);
    },
    [lastClickedIndex, videos]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedUrls(new Set(videos));
  }, [videos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);

  const handleContextMenu = useCallback((url: string, x: number, y: number) => {
    setContextMenu({ url, x, y });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  }, []);

  const handleContextSetFeatured = useCallback(
    (url: string) => {
      const index = videos.indexOf(url);
      if (index <= 0) return;
      const reordered = arrayMove(videos, index, 0);
      onReorder(reordered);
      setContextMenu(null);
    },
    [videos, onReorder]
  );

  const handleContextCopyUrl = useCallback(
    (url: string) => {
      copyToClipboard(url);
      setContextMenu(null);
    },
    [copyToClipboard]
  );

  const handleContextEditSEO = useCallback(
    (url: string) => {
      onEditSEO([url]);
      setContextMenu(null);
    },
    [onEditSEO]
  );

  const handleContextDelete = useCallback(
    (url: string) => {
      onDelete(url);
      setContextMenu(null);
    },
    [onDelete]
  );

  const handleContextPlayVideo = useCallback(
    (url: string) => {
      onPlayVideo(url);
      setContextMenu(null);
    },
    [onPlayVideo]
  );

  const handleCardEditSEO = useCallback(
    (url: string) => {
      onEditSEO([url]);
    },
    [onEditSEO]
  );

  const handleDeleteSelected = useCallback(() => {
    const urls = Array.from(selectedUrls);
    onDeleteBatch(urls);
    setSelectedUrls(new Set());
  }, [selectedUrls, onDeleteBatch]);

  const handleEditSEOSelected = useCallback(() => {
    const urls = Array.from(selectedUrls);
    onEditSEO(urls);
    setSelectedUrls(new Set());
  }, [selectedUrls, onEditSEO]);

  const handleCopyUrlsSelected = useCallback(() => {
    const urls = Array.from(selectedUrls).join('\n');
    copyToClipboard(urls);
    setSelectedUrls(new Set());
  }, [selectedUrls, copyToClipboard]);

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg
          className="w-12 h-12 mb-3 opacity-40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm">No videos yet. Add your first video above.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {hasAnySelected && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm text-gray-600">
            {selectedUrls.size} of {videos.length} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-[#ed6437] hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs text-gray-500 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={videos} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((url, index) => {
              const meta = videoMetadata?.get(url);
              const parsed = parsedVideos.get(url);
              return (
                <SortableVideoCard
                  key={url}
                  url={url}
                  index={index}
                  isSelected={selectedUrls.has(url)}
                  isUpdating={isUpdating}
                  isFeatured={index === 0}
                  thumbnailUrl={parsed?.thumbnailUrl ?? null}
                  provider={parsed?.provider ?? 'unknown'}
                  embedUrl={parsed?.embedUrl ?? null}
                  hasAnySelected={hasAnySelected}
                  altText={meta?.altText}
                  titleText={meta?.titleText}
                  onToggleSelect={handleToggleSelectCard}
                  onDelete={onDelete}
                  onPlayVideo={onPlayVideo}
                  onCopyUrl={handleContextCopyUrl}
                  onEditSEO={handleCardEditSEO}
                  onContextMenu={handleContextMenu}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {contextMenu && (
        <VideoContextMenu
          url={contextMenu.url}
          x={contextMenu.x}
          y={contextMenu.y}
          isFeatured={videos.indexOf(contextMenu.url) === 0}
          onClose={handleCloseContextMenu}
          onSetFeatured={handleContextSetFeatured}
          onCopyUrl={handleContextCopyUrl}
          onEditSEO={handleContextEditSEO}
          onDelete={handleContextDelete}
          onPlayVideo={handleContextPlayVideo}
        />
      )}

      {hasAnySelected && (
        <VideoBatchBar
          selectedCount={selectedUrls.size}
          onDeleteSelected={handleDeleteSelected}
          onEditSEOSelected={handleEditSEOSelected}
          onCopyUrlsSelected={handleCopyUrlsSelected}
          onDeselectAll={handleDeselectAll}
          isUpdating={isUpdating}
        />
      )}

      {showCopyToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded shadow-lg pointer-events-none">
          Copied to clipboard
        </div>
      )}
    </div>
  );
}

export function VideoGrid(props: VideoGridProps) {
  return (
    <ErrorBoundary componentName="VideoGrid">
      <VideoGridInner {...props} />
    </ErrorBoundary>
  );
}
