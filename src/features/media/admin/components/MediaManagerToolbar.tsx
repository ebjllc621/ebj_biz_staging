/**
 * MediaManagerToolbar - View toggle, search, and action buttons toolbar
 *
 * Horizontal toolbar between breadcrumb and file display area.
 * Left: file/folder count + search input
 * Right: "New Folder" button + view toggle (grid/list) + refresh
 *
 * @tier STANDARD
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import { memo } from 'react';
import { LayoutGrid, List, FolderPlus, Upload, RefreshCw, Search } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface MediaManagerToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (_mode: 'grid' | 'list') => void;
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  onCreateFolder: () => void;
  onUploadClick: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  isUploading?: boolean;
  totalFiles?: number;
  totalFolders?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MediaManagerToolbar - Toolbar for the media browser main content area
 */
export const MediaManagerToolbar = memo(function MediaManagerToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onCreateFolder,
  onUploadClick,
  onRefresh,
  isLoading = false,
  isUploading = false,
  totalFiles = 0,
  totalFolders = 0,
}: MediaManagerToolbarProps) {
  const itemCount = totalFiles + totalFolders;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-white border-b">
      {/* Left: count + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Summary */}
        <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
          {itemCount === 0
            ? 'Empty'
            : `${totalFolders > 0 ? `${totalFolders} folder${totalFolders !== 1 ? 's' : ''}` : ''}${
                totalFolders > 0 && totalFiles > 0 ? ', ' : ''
              }${totalFiles > 0 ? `${totalFiles} file${totalFiles !== 1 ? 's' : ''}` : ''}`
          }
        </span>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            aria-label="Filter files by name"
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Upload Media button */}
        <button
          type="button"
          onClick={onUploadClick}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#ed6437] text-white rounded-md hover:bg-[#d55a31] transition-colors disabled:opacity-50"
          title="Upload media to current directory"
        >
          <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload Media'}</span>
        </button>

        {/* New Folder button */}
        <button
          type="button"
          onClick={onCreateFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          title="Create new folder"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Folder</span>
        </button>

        {/* View mode toggle */}
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`px-2.5 py-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
            title="Grid view"
            aria-label="Switch to grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`px-2.5 py-1.5 border-l border-gray-200 transition-colors ${
              viewMode === 'list'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
            title="List view"
            aria-label="Switch to list view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          title="Refresh"
          aria-label="Refresh directory"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
});

export default MediaManagerToolbar;
