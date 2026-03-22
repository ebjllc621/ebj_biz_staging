/**
 * SortableGalleryCard - Individual draggable image card for GalleryGrid
 *
 * @description Draggable image card with selection, context menu, and action buttons.
 *   Uses @dnd-kit/sortable for drag-and-drop reordering.
 * @component Client Component
 * @tier STANDARD
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Memoized with React.memo
 * - Orange theme (#ed6437) for featured badge and selected state
 * - GripVertical drag handle with useSortable attributes/listeners
 */
'use client';

import React, { memo, useCallback } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Star, FileText } from 'lucide-react';
import { SEOHealthBadge } from '@features/media/admin/components/SEOHealthBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface SortableGalleryCardProps {
  url: string;
  index: number;
  isSelected: boolean;
  isUpdating: boolean;
  isFeatured: boolean;
  altText?: string;
  titleText?: string;
  hasAnySelected: boolean;
  // eslint-disable-next-line no-unused-vars
  onToggleSelect: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onEdit: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onCopyUrl: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onEditSEO: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onContextMenu: (url: string, x: number, y: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SortableGalleryCard = memo(function SortableGalleryCard({
  url,
  index,
  isSelected,
  isUpdating,
  isFeatured,
  altText,
  titleText,
  hasAnySelected,
  onToggleSelect,
  onDelete,
  onEdit,
  onCopyUrl,
  onEditSEO,
  onContextMenu,
}: SortableGalleryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    scale: isDragging ? '1.05' : undefined,
  };

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onToggleSelect(url);
    },
    [url, onToggleSelect]
  );

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(url);
    },
    [url, onEdit]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(url);
    },
    [url, onDelete]
  );

  const handleCopyClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopyUrl(url);
    },
    [url, onCopyUrl]
  );

  const handleSEOClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditSEO(url);
    },
    [url, onEditSEO]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(url, e.clientX, e.clientY);
    },
    [url, onContextMenu]
  );

  const showCheckbox = isSelected || hasAnySelected;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={handleContextMenu}
      className={[
        'relative aspect-square bg-gray-100 rounded-lg overflow-hidden group',
        'border-2 transition-all duration-150',
        isSelected
          ? 'border-[#ed6437] ring-2 ring-[#ed6437]/30'
          : 'border-gray-200 hover:border-[#ed6437]',
        isDragging ? 'cursor-grabbing shadow-xl' : 'cursor-default',
      ].join(' ')}
    >
      {/* Image */}
      <Image
        src={url}
        alt={altText || `Gallery image ${index + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        draggable={false}
      />

      {/* Drag Handle - top-right, visible on hover or when dragging */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className={[
          'absolute top-1 right-1 z-20 p-1 rounded bg-black/50 text-white',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isDragging ? 'opacity-100 cursor-grabbing' : 'cursor-grab',
          isUpdating ? 'pointer-events-none' : '',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Selection Checkbox - top-left */}
      <div
        className={[
          'absolute top-1 left-1 z-20',
          showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          'transition-opacity',
        ].join(' ')}
        onClick={handleCheckboxClick}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          aria-label={`Select image ${index + 1}`}
          className="w-4 h-4 accent-[#ed6437] cursor-pointer rounded"
        />
      </div>

      {/* Primary Badge - top area (below drag handle / checkbox row), index 0 only */}
      {isFeatured && (
        <div className="absolute top-8 left-2 z-10 bg-[#ed6437] text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 shadow-sm">
          <Star className="w-3 h-3" />
          Primary
        </div>
      )}

      {/* SEO Health Badge - bottom-left */}
      <div className="absolute bottom-2 left-2 z-10">
        <SEOHealthBadge altText={altText} titleText={titleText} size="md" />
      </div>

      {/* Image Number - bottom-right */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/60 text-white px-2 py-0.5 rounded text-xs font-medium">
        {index + 1}
      </div>

      {/* Hover Overlay with Edit/Delete/Copy buttons */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
        <button
          type="button"
          onClick={handleEditClick}
          disabled={isUpdating}
          aria-label={`Edit image ${index + 1}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-md"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCopyClick}
          disabled={isUpdating}
          aria-label={`Copy URL for image ${index + 1}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-md"
        >
          {/* Link icon inline to avoid extra import */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleSEOClick}
          disabled={isUpdating}
          aria-label={`Edit SEO for image ${index + 1}`}
          title="Edit SEO"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-md"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isUpdating}
          aria-label={`Delete image ${index + 1}`}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 shadow-md"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Updating overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-30">
          <div className="w-5 h-5 border-2 border-[#ed6437] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

SortableGalleryCard.displayName = 'SortableGalleryCard';

export default SortableGalleryCard;
