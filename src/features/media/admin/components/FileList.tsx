/**
 * FileList - Table/list view of media files and folders
 *
 * Renders a sortable table with columns: Name, Type, Size, Modified, Actions.
 * Folders render first, then files. Rows support delete and rename actions.
 *
 * @tier STANDARD
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import { memo, useState, useCallback } from 'react';
import {
  Folder,
  FileImage,
  FileVideo,
  FileText,
  File,
  FolderOpen,
  Trash2,
  PenLine,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getFileTypeLabel(entry: DirectoryEntry): string {
  if (entry.type === 'folder') return 'Folder';
  const mime = entry.mimeType ?? '';
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('text/')) return 'Text';
  if (mime.includes('document')) return 'Document';
  if (mime.includes('spreadsheet')) return 'Spreadsheet';
  if (mime) return mime.split('/')[1]?.toUpperCase() ?? 'File';
  return 'File';
}

function getFileIcon(entry: DirectoryEntry) {
  if (entry.type === 'folder') return <Folder className="w-4 h-4 text-blue-400" />;
  const mime = entry.mimeType ?? '';
  if (mime.startsWith('image/')) return <FileImage className="w-4 h-4 text-green-500" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-4 h-4 text-purple-500" />;
  if (mime.startsWith('text/') || mime === 'application/pdf' || mime.includes('document')) {
    return <FileText className="w-4 h-4 text-blue-500" />;
  }
  return <File className="w-4 h-4 text-gray-400" />;
}

type SortColumn = 'name' | 'type' | 'size' | 'modified';
type SortDir = 'asc' | 'desc';

function sortEntries(entries: DirectoryEntry[], column: SortColumn, dir: SortDir): DirectoryEntry[] {
  const multiplier = dir === 'asc' ? 1 : -1;

  return [...entries].sort((a, b) => {
    // Folders always first
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    switch (column) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'type':
        return multiplier * getFileTypeLabel(a).localeCompare(getFileTypeLabel(b));
      case 'size':
        return multiplier * ((a.size ?? 0) - (b.size ?? 0));
      case 'modified':
        return multiplier * (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime());
      default:
        return 0;
    }
  });
}

// ============================================================================
// TYPES
// ============================================================================

export interface FileListProps {
  entries: DirectoryEntry[];
  onFolderClick?: (_folder: DirectoryEntry) => void;
  onDeleteFile?: (_file: DirectoryEntry) => void;
  onRenameFile?: (_file: DirectoryEntry) => void;
  onDeleteFolder?: (_folder: DirectoryEntry) => void;
  isLoading?: boolean;
  // Phase 4B - Multi-select
  selectedIds?: Set<number>;
  onToggleSelect?: (_fileId: number) => void;
  // Phase 4B - Context menus
  onFileContextMenu?: (_file: DirectoryEntry, _x: number, _y: number) => void;
  onFolderContextMenu?: (_folder: DirectoryEntry, _x: number, _y: number) => void;
}

// ============================================================================
// SKELETON
// ============================================================================

function ListSkeleton() {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="w-8 px-2 py-2" />
          <th className="px-3 py-2 text-left">Name</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-left">Size</th>
          <th className="px-3 py-2 text-left">Modified</th>
          <th className="px-3 py-2 text-left w-20">Actions</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(6)].map((_, i) => (
          <tr key={i} className="border-b animate-pulse">
            <td className="px-2 py-2.5"><div className="w-4 h-4 bg-gray-100 rounded" /></td>
            <td className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            </td>
            <td className="px-3 py-2.5"><div className="h-3 bg-gray-100 rounded w-12" /></td>
            <td className="px-3 py-2.5"><div className="h-3 bg-gray-100 rounded w-16" /></td>
            <td className="px-3 py-2.5"><div className="h-3 bg-gray-100 rounded w-24" /></td>
            <td className="px-3 py-2.5"><div className="h-3 bg-gray-100 rounded w-10" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================================
// SORT INDICATOR
// ============================================================================

function SortIndicator({ column, sortColumn, sortDir }: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDir: SortDir;
}) {
  if (column !== sortColumn) {
    return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-0.5" />;
  }
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-orange-500 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 text-orange-500 inline ml-0.5" />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * FileList - Sortable table view of media files and folders
 */
export const FileList = memo(function FileList({
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
}: FileListProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = useCallback((column: SortColumn) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return column;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded border border-gray-200">
        <ListSkeleton />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FolderOpen className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">This directory is empty</p>
      </div>
    );
  }

  const sorted = sortEntries(entries, sortColumn, sortDir);

  const thClass =
    'px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-orange-600 select-none';

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {/* Checkbox column */}
            <th className="w-8 px-2 py-2" aria-label="Select" />
            <th className={thClass} onClick={() => handleSort('name')}>
              Name <SortIndicator column="name" sortColumn={sortColumn} sortDir={sortDir} />
            </th>
            <th className={thClass} onClick={() => handleSort('type')}>
              Type <SortIndicator column="type" sortColumn={sortColumn} sortDir={sortDir} />
            </th>
            <th className={thClass} onClick={() => handleSort('size')}>
              Size <SortIndicator column="size" sortColumn={sortColumn} sortDir={sortDir} />
            </th>
            <th className={thClass} onClick={() => handleSort('modified')}>
              Modified <SortIndicator column="modified" sortColumn={sortColumn} sortDir={sortDir} />
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const isFolder = entry.type === 'folder';
            const isSelected =
              !isFolder &&
              entry.mediaFileId !== undefined &&
              selectedIds?.has(entry.mediaFileId);
            const showCheckbox =
              !isFolder &&
              onToggleSelect !== undefined &&
              entry.mediaFileId !== undefined;

            const handleContextMenu = (e: React.MouseEvent) => {
              e.preventDefault();
              if (isFolder && onFolderContextMenu) {
                onFolderContextMenu(entry, e.clientX, e.clientY);
              } else if (!isFolder && onFileContextMenu) {
                onFileContextMenu(entry, e.clientX, e.clientY);
              }
            };

            return (
              <tr
                key={entry.path}
                className={`border-b transition-colors ${
                  isSelected ? 'bg-blue-50' : isFolder ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'
                }`}
                onDoubleClick={isFolder ? () => onFolderClick?.(entry) : undefined}
                onClick={isFolder ? () => onFolderClick?.(entry) : undefined}
                onContextMenu={handleContextMenu}
              >
                {/* Checkbox */}
                <td className="w-8 px-2 py-2.5">
                  {showCheckbox && (
                    <input
                      type="checkbox"
                      checked={isSelected ?? false}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (entry.mediaFileId !== undefined) {
                          onToggleSelect!(entry.mediaFileId);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                      aria-label={`Select ${entry.name}`}
                    />
                  )}
                </td>

                {/* Name */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0">{getFileIcon(entry)}</span>
                    <span
                      className={`truncate max-w-[240px] ${isFolder ? 'font-medium text-gray-800' : 'text-gray-700'}`}
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-3 py-2.5 text-gray-500">
                  {getFileTypeLabel(entry)}
                </td>

                {/* Size */}
                <td className="px-3 py-2.5 text-gray-500">
                  {isFolder
                    ? `${entry.childCount ?? 0} item${(entry.childCount ?? 0) !== 1 ? 's' : ''}`
                    : formatFileSize(entry.size)
                  }
                </td>

                {/* Modified */}
                <td className="px-3 py-2.5 text-gray-500">
                  {formatDate(entry.modifiedAt)}
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {!isFolder && onRenameFile && (
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameFile(entry);
                        }}
                        title="Rename"
                        aria-label={`Rename ${entry.name}`}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {((isFolder && onDeleteFolder) || (!isFolder && onDeleteFile)) && (
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFolder) {
                            onDeleteFolder?.(entry);
                          } else {
                            onDeleteFile?.(entry);
                          }
                        }}
                        title="Delete"
                        aria-label={`Delete ${entry.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default FileList;
