/**
 * @component VideoContextMenu
 * @tier STANDARD
 * @phase Video Gallery Manager
 *
 * Right-click / long-press context menu for individual video items in the
 * Video Gallery Manager. Replicates GalleryImageContextMenu with video-specific
 * adaptations: removes crop/edit-image, adds Play Video at the top.
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Play, Link, FileSearch, Star, Trash2 } from 'lucide-react';

/* eslint-disable no-unused-vars */
export interface VideoContextMenuProps {
  x: number;
  y: number;
  url: string;
  isFeatured: boolean;
  onClose: () => void;
  onPlayVideo: (url: string) => void;
  onCopyUrl: (url: string) => void;
  onEditSEO: (url: string) => void;
  onSetFeatured: (url: string) => void;
  onDelete: (url: string) => void;
}
/* eslint-enable no-unused-vars */

const MENU_WIDTH = 200;
const MENU_ESTIMATED_HEIGHT = 230;

export function VideoContextMenu({
  x,
  y,
  url: videoUrl,
  isFeatured,
  onClose,
  onPlayVideo,
  onCopyUrl,
  onEditSEO,
  onSetFeatured,
  onDelete,
}: VideoContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position so menu stays inside the viewport
  const adjustedX =
    x + MENU_WIDTH > window.innerWidth ? x - MENU_WIDTH : x;
  const adjustedY =
    y + MENU_ESTIMATED_HEIGHT > window.innerHeight
      ? y - MENU_ESTIMATED_HEIGHT
      : y;

  // Dismiss on click-outside
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Dismiss on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOutsideClick, handleKeyDown]);

  const handlePlayVideo = () => {
    onPlayVideo(videoUrl);
    onClose();
  };

  const handleCopyUrl = () => {
    onCopyUrl(videoUrl);
    onClose();
  };

  const handleEditSEO = () => {
    onEditSEO(videoUrl);
    onClose();
  };

  const handleSetFeatured = () => {
    onSetFeatured(videoUrl);
    onClose();
  };

  const handleDelete = () => {
    onDelete(videoUrl);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Video options"
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: 9999,
        width: MENU_WIDTH,
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm"
    >
      {/* Play Video */}
      <button
        role="menuitem"
        onClick={handlePlayVideo}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none min-h-[44px]"
      >
        <Play size={15} className="text-[#ed6437] flex-shrink-0" />
        <span>Play Video</span>
      </button>

      {/* Copy Video URL */}
      <button
        role="menuitem"
        onClick={handleCopyUrl}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none min-h-[44px]"
      >
        <Link size={15} className="text-gray-500 flex-shrink-0" />
        <span>Copy Video URL</span>
      </button>

      {/* Edit SEO Data */}
      <button
        role="menuitem"
        onClick={handleEditSEO}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none min-h-[44px]"
      >
        <FileSearch size={15} className="text-gray-500 flex-shrink-0" />
        <span>Edit SEO Data</span>
      </button>

      {/* Set as Primary (hidden when already featured) */}
      {!isFeatured && (
        <button
          role="menuitem"
          onClick={handleSetFeatured}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none min-h-[44px]"
        >
          <Star size={15} className="text-gray-500 flex-shrink-0" />
          <span>Set as Primary</span>
        </button>
      )}

      {/* Separator */}
      <div className="border-t border-gray-100 my-1" role="separator" />

      {/* Delete */}
      <button
        role="menuitem"
        onClick={handleDelete}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none min-h-[44px]"
      >
        <Trash2 size={15} className="flex-shrink-0" />
        <span>Delete</span>
      </button>
    </div>
  );
}
