/**
 * FileGrid - Thumbnail grid view of media files and folders
 *
 * Renders a CSS grid of file/folder cards with:
 * - Mini action menu (kebab dropdown) in upper-right corner
 * - Drag-and-drop reordering via @dnd-kit (files only)
 * - Multi-select with checkboxes
 * - Context menu support
 * - SEO health badge on image files
 *
 * Pattern: Replicated from GalleryGrid (DnD) + SortableGalleryCard (actions).
 *
 * @tier ADVANCED
 * @phase Phase 5 - Enhanced File Actions + DnD
 */

'use client';

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Folder,
  FileImage,
  FileVideo,
  FileText,
  File,
  FolderOpen,
  GripVertical,
} from 'lucide-react';
import { SEOHealthBadge } from './SEOHealthBadge';
import { FileCardActionMenu } from './FileCardActionMenu';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(entry: DirectoryEntry) {
  const mime = entry.mimeType ?? '';

  if (mime.startsWith('image/')) return <FileImage className="w-8 h-8 text-green-500" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-8 h-8 text-purple-500" />;
  if (
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime.includes('document') ||
    mime.includes('spreadsheet')
  ) {
    return <FileText className="w-8 h-8 text-blue-500" />;
  }

  return <File className="w-8 h-8 text-gray-400" />;
}

function isImageEntry(entry: DirectoryEntry): boolean {
  return (entry.mimeType ?? '').startsWith('image/');
}

// ============================================================================
// TYPES
// ============================================================================

export interface FileGridProps {
  entries: DirectoryEntry[];
  onFolderClick?: (folder: DirectoryEntry) => void;
  onDeleteFile?: (file: DirectoryEntry) => void;
  onRenameFile?: (file: DirectoryEntry) => void;
  onDeleteFolder?: (folder: DirectoryEntry) => void;
  isLoading?: boolean;
  // Multi-select
  selectedIds?: Set<number>;
  onToggleSelect?: (fileId: number) => void;
  // Context menus
  onFileContextMenu?: (file: DirectoryEntry, x: number, y: number) => void;
  onFolderContextMenu?: (folder: DirectoryEntry, x: number, y: number) => void;
  // Enhanced actions (Phase 5)
  onViewFile?: (file: DirectoryEntry) => void;
  onEditFile?: (file: DirectoryEntry) => void;
  onCopyLink?: (file: DirectoryEntry) => void;
  onEditSEO?: (file: DirectoryEntry) => void;
  onMoveFile?: (file: DirectoryEntry) => void;
  // Drag-and-drop reorder
  onReorder?: (reorderedEntries: DirectoryEntry[]) => void;
}

// ============================================================================
// SKELETON
// ============================================================================

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-t-lg" />
          <div className="p-2">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
            <div className="h-2 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SORTABLE FILE CARD (for files - draggable)
// ============================================================================

interface SortableFileCardProps {
  entry: DirectoryEntry;
  isSelected: boolean;
  showCheckbox: boolean;
  isImage: boolean;
  onToggleSelect?: (fileId: number) => void;
  onFileContextMenu?: (file: DirectoryEntry, x: number, y: number) => void;
  // Action menu callbacks
  onViewFile?: (file: DirectoryEntry) => void;
  onEditFile?: (file: DirectoryEntry) => void;
  onCopyLink?: (file: DirectoryEntry) => void;
  onEditSEO?: (file: DirectoryEntry) => void;
  onMoveFile?: (file: DirectoryEntry) => void;
  onRenameFile?: (file: DirectoryEntry) => void;
  onDeleteFile?: (file: DirectoryEntry) => void;
}

const SortableFileCard = memo(function SortableFileCard({
  entry,
  isSelected,
  showCheckbox,
  isImage,
  onToggleSelect,
  onFileContextMenu,
  onViewFile,
  onEditFile,
  onCopyLink,
  onEditSEO,
  onMoveFile,
  onRenameFile,
  onDeleteFile,
}: SortableFileCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.mediaFileId?.toString() ?? entry.path });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onFileContextMenu?.(entry, e.clientX, e.clientY);
    },
    [entry, onFileContextMenu]
  );

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (entry.mediaFileId !== undefined) {
        onToggleSelect?.(entry.mediaFileId);
      }
    },
    [entry.mediaFileId, onToggleSelect]
  );

  // Noop handlers for menu items that don't have callbacks
  const noopHandler = useCallback(() => {}, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={handleContextMenu}
      className={[
        'group relative bg-white rounded-lg border transition-all',
        isSelected
          ? 'border-[#ed6437] ring-2 ring-[#ed6437]/30 shadow-md'
          : 'border-gray-200 hover:shadow-md hover:border-gray-300',
        isDragging ? 'cursor-grabbing shadow-xl scale-105' : 'cursor-default',
      ].join(' ')}
      role="article"
      aria-label={`File: ${entry.name}`}
    >
      {/* Selection checkbox - top-left */}
      {showCheckbox && (
        <div
          className={[
            'absolute top-1.5 left-1.5 z-20',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity',
          ].join(' ')}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 accent-[#ed6437] cursor-pointer rounded"
            aria-label={`Select ${entry.name}`}
          />
        </div>
      )}

      {/* Drag handle - top-left area (next to checkbox) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className={[
          'absolute top-1.5 z-20 p-0.5 rounded bg-white/80 text-gray-400',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isDragging ? 'opacity-100 cursor-grabbing' : 'cursor-grab hover:text-gray-600',
          showCheckbox ? 'left-7' : 'left-1.5',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Mini action menu - top-right */}
      <div
        className={[
          'absolute top-1.5 right-1.5 z-20',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        ].join(' ')}
      >
        <FileCardActionMenu
          entry={entry}
          isImage={isImage}
          onView={onViewFile ?? noopHandler}
          onEdit={onEditFile ?? noopHandler}
          onCopyLink={onCopyLink ?? noopHandler}
          onEditSEO={onEditSEO ?? noopHandler}
          onMove={onMoveFile ?? noopHandler}
          onRename={onRenameFile ?? noopHandler}
          onDelete={onDeleteFile ?? noopHandler}
        />
      </div>

      {/* Thumbnail or icon area */}
      <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center">
        {isImage && (entry.thumbnailUrl || entry.url) ? (
          // eslint-disable-next-line @next/next/no-img-element -- File grid preview: dynamic external URLs
          <img
            src={entry.thumbnailUrl || entry.url}
            alt={entry.altText || entry.name}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          getFileIcon(entry)
        )}
      </div>

      {/* SEO health badge - bottom-left of image area (images only) */}
      {isImage && (
        <div className="absolute bottom-8 left-2 z-10">
          <SEOHealthBadge altText={entry.altText} titleText={entry.titleText} size="sm" />
        </div>
      )}

      {/* File info */}
      <div className="p-2">
        <p className="text-xs truncate text-gray-800 font-medium" title={entry.name}>
          {entry.name}
        </p>
        <p className="text-xs text-gray-400">{formatFileSize(entry.size)}</p>
      </div>
    </div>
  );
});

// ============================================================================
// FOLDER CARD (non-draggable)
// ============================================================================

interface FolderCardProps {
  entry: DirectoryEntry;
  onFolderClick?: (folder: DirectoryEntry) => void;
  onDeleteFolder?: (folder: DirectoryEntry) => void;
  onFolderContextMenu?: (folder: DirectoryEntry, x: number, y: number) => void;
}

const FolderCard = memo(function FolderCard({
  entry,
  onFolderClick,
  onDeleteFolder,
  onFolderContextMenu,
}: FolderCardProps) {
  const handleClick = useCallback(() => {
    onFolderClick?.(entry);
  }, [entry, onFolderClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFolderClick?.(entry);
      }
    },
    [entry, onFolderClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onFolderContextMenu?.(entry, e.clientX, e.clientY);
    },
    [entry, onFolderContextMenu]
  );

  // Suppress unused parameter warning - kept for potential future folder delete via card
  void onDeleteFolder;

  return (
    <div
      className="group relative bg-white rounded-lg border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      aria-label={`Folder: ${entry.name}`}
    >
      {/* Folder icon area */}
      <div className="aspect-square overflow-hidden rounded-t-lg bg-gray-50 flex items-center justify-center">
        <Folder className="w-12 h-12 text-blue-400" />
      </div>

      {/* Folder info */}
      <div className="p-2">
        <p className="text-xs truncate text-gray-800 font-medium" title={entry.name}>
          {entry.name}
        </p>
        <p className="text-xs text-gray-400">
          {entry.childCount ?? 0} item{(entry.childCount ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FileGrid = memo(function FileGrid({
  entries,
  onFolderClick,
  onDeleteFile,
  onRenameFile,
  onDeleteFolder,
  isLoading = false,
  selectedIds,
  onToggleSelect,
  onFileContextMenu,
  onFolderContextMenu,
  onViewFile,
  onEditFile,
  onCopyLink,
  onEditSEO,
  onMoveFile,
  onReorder,
}: FileGridProps) {
  // Separate folders and files (memoized to avoid new refs each render)
  const folders = useMemo(() => entries.filter((e) => e.type === 'folder'), [entries]);
  const files = useMemo(() => entries.filter((e) => e.type === 'file'), [entries]);

  // DnD state - track local file order for drag reordering
  const [localFiles, setLocalFiles] = useState<DirectoryEntry[]>([]);

  // Sync localFiles when source files change (navigation, refresh, filter)
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  // Sortable IDs for DnD
  const sortableIds = localFiles.map(
    (f) => f.mediaFileId?.toString() ?? f.path
  );

  // DnD sensors (same pattern as GalleryGrid)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortableIds.indexOf(String(active.id));
      const newIndex = sortableIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localFiles, oldIndex, newIndex);
      setLocalFiles(reordered);
      onReorder?.([...folders, ...reordered]);
    },
    [sortableIds, localFiles, folders, onReorder]
  );

  if (isLoading) {
    return <GridSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FolderOpen className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">No files in this directory</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {/* Folders first (not draggable) */}
      {folders.map((entry) => (
        <FolderCard
          key={entry.path}
          entry={entry}
          onFolderClick={onFolderClick}
          onDeleteFolder={onDeleteFolder}
          onFolderContextMenu={onFolderContextMenu}
        />
      ))}

      {/* Files with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          {localFiles.map((entry) => {
            const isImage = isImageEntry(entry);
            const isSelected =
              entry.mediaFileId !== undefined &&
              (selectedIds?.has(entry.mediaFileId) ?? false);
            const showCheckbox = onToggleSelect !== undefined;

            return (
              <SortableFileCard
                key={entry.path}
                entry={entry}
                isSelected={isSelected}
                showCheckbox={showCheckbox}
                isImage={isImage}
                onToggleSelect={onToggleSelect}
                onFileContextMenu={onFileContextMenu}
                onViewFile={onViewFile}
                onEditFile={onEditFile}
                onCopyLink={onCopyLink}
                onEditSEO={onEditSEO}
                onMoveFile={onMoveFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export default FileGrid;
