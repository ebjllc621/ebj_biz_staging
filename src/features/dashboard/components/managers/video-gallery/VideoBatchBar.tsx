/**
 * @component VideoBatchBar
 * @tier STANDARD
 * @phase Video Gallery Manager
 *
 * Fixed bottom toolbar for batch operations on selected videos in the
 * Video Gallery Manager. Replicates GalleryBatchBar with video-specific
 * label changes ("images" → "videos").
 */

'use client';

import React from 'react';
import { CheckSquare, Square, Trash2, FileSearch, Link } from 'lucide-react';

export interface VideoBatchBarProps {
  selectedCount: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onDeleteSelected: () => void;
  onEditSEOSelected?: () => void;
  onCopyUrlsSelected?: () => void;
  onDeselectAll?: () => void;
  onEditSEO?: () => void;
  onCopyUrls?: () => void;
  isUpdating?: boolean;
}

export function VideoBatchBar({
  selectedCount,
  totalCount = 0,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onEditSEOSelected,
  onCopyUrlsSelected,
  onDeselectAll,
  onEditSEO,
  onCopyUrls,
}: VideoBatchBarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const handleClearSelection = onClearSelection ?? onDeselectAll;
  const handleEditSEO = onEditSEO ?? onEditSEOSelected;
  const handleCopyUrls = onCopyUrls ?? onCopyUrlsSelected;

  return (
    <div
      role="toolbar"
      aria-label="Batch operations"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
      style={{ minHeight: '56px' }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 h-14">
        {/* Select all / clear toggle */}
        <button
          onClick={allSelected ? handleClearSelection : onSelectAll}
          aria-label={allSelected ? 'Clear selection' : 'Select all videos'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ed6437] min-h-[44px]"
        >
          {allSelected ? (
            <CheckSquare size={16} className="text-[#ed6437] flex-shrink-0" />
          ) : (
            <Square size={16} className="text-gray-500 flex-shrink-0" />
          )}
          <span className="hidden sm:inline">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
        </button>

        {/* Selected count label */}
        <span className="text-sm text-gray-600 font-medium mr-auto">
          <span className="text-[#ed6437] font-semibold">{selectedCount}</span>
          {' '}
          <span className="hidden xs:inline">
            of {totalCount}
          </span>
          {' '}
          <span>selected</span>
        </span>

        {/* Copy URLs */}
        <button
          onClick={handleCopyUrls}
          disabled={selectedCount === 0}
          aria-label="Copy URLs of selected videos"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ed6437] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Link size={16} className="flex-shrink-0" />
          <span className="hidden sm:inline">Copy URLs</span>
        </button>

        {/* Edit SEO */}
        <button
          onClick={handleEditSEO}
          disabled={selectedCount === 0}
          aria-label="Edit SEO for selected videos"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ed6437] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          <FileSearch size={16} className="flex-shrink-0" />
          <span className="hidden sm:inline">Edit SEO</span>
        </button>

        {/* Delete selected */}
        <button
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          aria-label="Delete selected videos"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Trash2 size={16} className="flex-shrink-0" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}
