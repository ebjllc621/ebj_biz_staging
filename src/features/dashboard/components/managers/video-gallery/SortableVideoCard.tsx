'use client';

/**
 * SortableVideoCard
 * @tier STANDARD
 * @phase Video Gallery Manager
 * @description Drag-and-drop sortable video card for the Video Gallery Manager.
 * Replicates SortableGalleryCard pattern adapted for video entries.
 */

import React, { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Trash2, Star, FileText, Film } from 'lucide-react';

/* eslint-disable no-unused-vars */
export interface SortableVideoCardProps {
  url: string;
  index: number;
  isSelected: boolean;
  isUpdating: boolean;
  isFeatured: boolean;
  thumbnailUrl: string | null;
  provider: string;
  embedUrl: string | null;
  hasAnySelected: boolean;
  altText?: string;
  titleText?: string;
  onToggleSelect: (url: string, index: number, shiftKey: boolean) => void;
  onDelete: (url: string) => void;
  onPlayVideo: (url: string) => void;
  onCopyUrl: (url: string) => void;
  onEditSEO: (url: string) => void;
  onContextMenu: (url: string, x: number, y: number) => void;
}
/* eslint-enable no-unused-vars */

const PROVIDER_COLORS: Record<string, string> = {
  youtube: 'bg-red-600',
  vimeo: 'bg-blue-500',
  tiktok: 'bg-gray-800',
  dailymotion: 'bg-blue-600',
  rumble: 'bg-green-600',
  direct: 'bg-gray-500',
  unknown: 'bg-gray-400',
};

function getProviderColor(provider: string): string {
  const key = provider.toLowerCase();
  return PROVIDER_COLORS[key] ?? PROVIDER_COLORS['unknown'] ?? 'bg-gray-400';
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const CopyLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const SortableVideoCard = memo(function SortableVideoCard({
  url,
  index,
  isSelected,
  isUpdating,
  isFeatured,
  thumbnailUrl,
  provider,
  embedUrl,
  hasAnySelected,
  onToggleSelect,
  onDelete,
  onPlayVideo,
  onCopyUrl,
  onEditSEO,
  onContextMenu,
}: SortableVideoCardProps) {
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
    zIndex: isDragging ? 50 : undefined,
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(url, e.clientX, e.clientY);
    },
    [url, onContextMenu]
  );

  const handleToggleSelect = useCallback((e: React.MouseEvent) => {
    onToggleSelect(url, index, e.shiftKey);
  }, [url, index, onToggleSelect]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(url);
    },
    [url, onDelete]
  );

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPlayVideo(url);
    },
    [url, onPlayVideo]
  );

  const handleCopyUrl = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCopyUrl(url);
    },
    [url, onCopyUrl]
  );

  const handleEditSEO = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditSEO(url);
    },
    [url, onEditSEO]
  );

  const hasThumbnail = thumbnailUrl && thumbnailUrl.trim() !== '';
  const providerColor = getProviderColor(provider);
  const providerLabel = capitalizeFirst(provider || 'Unknown');

  const borderClass = isSelected
    ? 'border-2 border-[#ed6437]'
    : 'border-2 border-transparent hover:border-gray-300';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-video rounded-lg overflow-hidden group bg-gray-100 ${borderClass} transition-all duration-150 ${
        isUpdating ? 'opacity-60 pointer-events-none' : ''
      }`}
      onContextMenu={handleContextMenu}
    >
      {/* Thumbnail, inline embed, or placeholder */}
      {hasThumbnail ? (
        <img
          src={thumbnailUrl as string}
          alt={`Video thumbnail ${index + 1}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : embedUrl && provider !== 'direct' ? (
        <iframe
          src={embedUrl}
          title={`Video ${index + 1}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      ) : embedUrl && provider === 'direct' ? (
        <video
          src={embedUrl}
          className="w-full h-full object-cover pointer-events-none"
          muted
        >
          <p className="text-gray-500">Video preview unavailable</p>
        </video>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
          <Film className="w-10 h-10 text-gray-400" aria-hidden="true" />
        </div>
      )}

      {/* Semi-transparent play button overlay — always visible */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
          <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
        </div>
      </div>

      {/* Hover overlay with action buttons */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
        {/* Play button */}
        <button
          type="button"
          onClick={handlePlay}
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow"
          title="Play video"
          aria-label="Play video"
        >
          <Play className="w-4 h-4 text-gray-800 ml-0.5" />
        </button>

        {/* Copy URL button */}
        <button
          type="button"
          onClick={handleCopyUrl}
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow text-gray-800"
          title="Copy video URL"
          aria-label="Copy video URL"
        >
          <CopyLinkIcon />
        </button>

        {/* SEO button */}
        <button
          type="button"
          onClick={handleEditSEO}
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow"
          title="Edit SEO metadata"
          aria-label="Edit SEO metadata"
        >
          <FileText className="w-4 h-4 text-gray-800" />
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow"
          title="Delete video"
          aria-label="Delete video"
        >
          <Trash2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Drag handle — top-left */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 rounded bg-black/30 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </div>

      {/* Selection checkbox — top-right */}
      <div
        className={`absolute top-1 right-1 z-10 transition-opacity duration-150 ${
          hasAnySelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={handleToggleSelect}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[#ed6437] border-[#ed6437]'
              : 'bg-white/80 border-gray-400 hover:border-[#ed6437]'
          }`}
          aria-label={isSelected ? 'Deselect video' : 'Select video'}
          aria-pressed={isSelected}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="2,6 5,9 10,3" />
            </svg>
          )}
        </button>
      </div>

      {/* Featured badge — top area, below drag handle when both visible */}
      {isFeatured && (
        <div className="absolute top-7 left-1 z-10">
          <div className="flex items-center gap-0.5 bg-[#ed6437] text-white text-xs px-1.5 py-0.5 rounded shadow">
            <Star className="w-2.5 h-2.5 fill-white" aria-hidden="true" />
            <span className="leading-none font-medium">Featured</span>
          </div>
        </div>
      )}

      {/* Number badge — bottom-right */}
      <div className="absolute bottom-1 right-1 z-10">
        <div className="bg-black/50 text-white text-xs w-5 h-5 rounded flex items-center justify-center font-medium leading-none">
          {index + 1}
        </div>
      </div>

      {/* Provider badge — bottom-left */}
      <div className="absolute bottom-1 left-1 z-10">
        <span
          className={`${providerColor} text-white text-xs px-1.5 py-0.5 rounded font-medium leading-none`}
        >
          {providerLabel}
        </span>
      </div>
    </div>
  );
});

export default SortableVideoCard;
