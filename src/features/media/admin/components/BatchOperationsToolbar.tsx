/**
 * BatchOperationsToolbar - Floating toolbar displayed when files are selected
 *
 * Pattern: AdminBatchHandlingBar (fixed bottom position, selection count, action buttons).
 * Only renders when selectedCount > 0.
 *
 * CRITICAL: Statistics panel is a TOP BAR. This toolbar uses fixed bottom
 * positioning and does NOT conflict with the stats bar.
 *
 * @tier STANDARD
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { memo } from 'react';
import { X, Trash2, FolderInput, Copy, FileSearch, Link } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface BatchOperationsToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onBulkSEO: () => void;
  onCopyLinks?: () => void;
  onClearSelection: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BatchOperationsToolbar = memo(function BatchOperationsToolbar({
  selectedCount,
  onDelete,
  onMove,
  onCopy,
  onBulkSEO,
  onCopyLinks,
  onClearSelection,
}: BatchOperationsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
        {/* Left: Clear + count */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Clear selection"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            <span className="font-semibold text-orange-600">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'file' : 'files'} selected
          </span>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Links */}
          {onCopyLinks && (
            <button
              type="button"
              onClick={onCopyLinks}
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
              title="Copy links of selected files"
            >
              <Link className="w-4 h-4" />
              <span className="hidden sm:inline">Copy Links</span>
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            title="Delete selected files"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Move */}
          <button
            type="button"
            onClick={onMove}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
            title="Move selected files"
          >
            <FolderInput className="w-4 h-4" />
            <span className="hidden sm:inline">Move</span>
          </button>

          {/* Copy */}
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
            title="Copy selected files"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          {/* SEO Edit */}
          <button
            type="button"
            onClick={onBulkSEO}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium rounded bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
            title="Edit SEO metadata for selected files"
          >
            <FileSearch className="w-4 h-4" />
            <span className="hidden sm:inline">SEO Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default BatchOperationsToolbar;
