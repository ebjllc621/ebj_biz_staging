/**
 * GalleryImageContextMenu - Right-click context menu for gallery images
 *
 * @description Fixed-position context menu with viewport boundary adjustment,
 *   click-outside dismissal, and Escape key handling.
 * @component Client Component
 * @tier STANDARD
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Fixed positioning via x/y props
 * - Viewport boundary adjustment
 * - Click-outside (mousedown) + Escape key dismissal
 */
'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Pencil, Link, FileSearch, Star, Trash2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryImageContextMenuProps {
  x: number;
  y: number;
  imageUrl: string;
  isFeatured: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onEdit: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onCopyUrl: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onEditSEO: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onSetFeatured: (url: string) => void;
  // eslint-disable-next-line no-unused-vars
  onDelete: (url: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GalleryImageContextMenu({
  x,
  y,
  imageUrl,
  isFeatured,
  onClose,
  onEdit,
  onCopyUrl,
  onEditSEO,
  onSetFeatured,
  onDelete,
}: GalleryImageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside and Escape key dismissal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Viewport boundary adjustment
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();

    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const handleEdit = useCallback(() => onEdit(imageUrl), [imageUrl, onEdit]);
  const handleCopyUrl = useCallback(() => onCopyUrl(imageUrl), [imageUrl, onCopyUrl]);
  const handleEditSEO = useCallback(() => onEditSEO(imageUrl), [imageUrl, onEditSEO]);
  const handleSetFeatured = useCallback(() => onSetFeatured(imageUrl), [imageUrl, onSetFeatured]);
  const handleDelete = useCallback(() => onDelete(imageUrl), [imageUrl, onDelete]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Image options"
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="min-w-[180px] bg-white rounded-lg shadow-xl border border-gray-200 py-1 text-sm"
    >
      <button
        type="button"
        role="menuitem"
        onClick={handleEdit}
        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-left transition-colors"
      >
        <Pencil className="w-4 h-4 flex-shrink-0 text-gray-500" />
        Edit Image
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleCopyUrl}
        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-left transition-colors"
      >
        <Link className="w-4 h-4 flex-shrink-0 text-gray-500" />
        Copy Image URL
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleEditSEO}
        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-left transition-colors"
      >
        <FileSearch className="w-4 h-4 flex-shrink-0 text-gray-500" />
        Edit SEO Data
      </button>

      {!isFeatured && (
        <button
          type="button"
          role="menuitem"
          onClick={handleSetFeatured}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 text-left transition-colors"
        >
          <Star className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          Set as Primary
        </button>
      )}

      <div className="border-t border-gray-100 my-1" role="separator" />

      <button
        type="button"
        role="menuitem"
        onClick={handleDelete}
        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 text-left transition-colors"
      >
        <Trash2 className="w-4 h-4 flex-shrink-0" />
        Delete
      </button>
    </div>
  );
}

export default GalleryImageContextMenu;
