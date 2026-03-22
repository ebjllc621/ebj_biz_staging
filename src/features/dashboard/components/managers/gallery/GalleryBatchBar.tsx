/**
 * GalleryBatchBar - Floating bottom batch operations toolbar
 *
 * @description Fixed bottom toolbar shown when images are selected.
 *   Provides batch delete, SEO edit, and copy URL actions.
 * @component Client Component
 * @tier STANDARD
 * @authority docs/media/galleryformat/phases/3-9-26/GALLERY_GRID_ENHANCEMENT_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Fixed bottom, z-40, min-h-[56px]
 * - 44px min touch targets
 * - Only renders when selectedCount > 0
 * - Responsive labels (hidden on mobile)
 */
'use client';

import React from 'react';
import { X, Trash2, FileSearch, Link } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface GalleryBatchBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onEditSEO: () => void;
  onCopyUrls: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GalleryBatchBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onEditSEO,
  onCopyUrls,
}: GalleryBatchBarProps) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg"
      role="toolbar"
      aria-label="Batch operations"
    >
      <div className="flex items-center justify-between px-4 py-3 min-h-[56px] max-w-7xl mx-auto">
        {/* Left side: clear + count + select all */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="text-sm font-medium text-gray-700">
            <span className="font-semibold text-[#ed6437]">{selectedCount}</span>
            <span className="hidden sm:inline"> of {totalCount}</span>
            {' '}selected
          </span>

          {!allSelected && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-sm text-[#ed6437] hover:underline font-medium hidden sm:inline"
            >
              Select All
            </button>
          )}
        </div>

        {/* Right side: action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyUrls}
            aria-label="Copy URLs of selected images"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] text-sm font-medium"
          >
            <Link className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Copy URLs</span>
          </button>

          <button
            type="button"
            onClick={onEditSEO}
            aria-label="Edit SEO for selected images"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors min-h-[44px] text-sm font-medium"
          >
            <FileSearch className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Edit SEO</span>
          </button>

          <button
            type="button"
            onClick={onDeleteSelected}
            aria-label="Delete selected images"
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] text-sm font-medium"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GalleryBatchBar;
