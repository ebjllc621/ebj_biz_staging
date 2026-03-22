/**
 * FileContextMenu - Right-click context menu for file entries
 *
 * Pattern: MessageContextMenu (fixed position via x/y props, click-outside via mousedown,
 * Escape key listener, viewport boundary adjustment via getBoundingClientRect).
 *
 * @tier STANDARD
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { memo, useRef, useEffect } from 'react';
import { Trash2, PenLine, FolderInput, Copy, FileSearch, Eye, Link } from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface FileContextMenuProps {
  x: number;
  y: number;
  file: DirectoryEntry;
  onClose: () => void;
  onDelete: (_file: DirectoryEntry) => void;
  onRename: (_file: DirectoryEntry) => void;
  onMove: (_file: DirectoryEntry) => void;
  onCopy: (_file: DirectoryEntry) => void;
  onViewSEO: (_file: DirectoryEntry) => void;
  onViewFile?: (_file: DirectoryEntry) => void;
  onCopyLink?: (_file: DirectoryEntry) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FileContextMenu = memo(function FileContextMenu({
  x,
  y,
  file,
  onClose,
  onDelete,
  onRename,
  onMove,
  onCopy,
  onViewSEO,
  onViewFile,
  onCopyLink,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside (mousedown pattern from MessageContextMenu)
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
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const itemClass =
    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      role="menu"
      aria-label={`Actions for ${file.name}`}
    >
      {/* View */}
      {onViewFile && (
        <button
          type="button"
          className={itemClass}
          onClick={() => { onViewFile(file); onClose(); }}
          role="menuitem"
        >
          <Eye className="w-4 h-4 text-gray-500" />
          View File
        </button>
      )}

      {/* Copy Link */}
      {onCopyLink && (
        <button
          type="button"
          className={itemClass}
          onClick={() => { onCopyLink(file); onClose(); }}
          role="menuitem"
        >
          <Link className="w-4 h-4 text-gray-500" />
          Copy Link
        </button>
      )}

      {(onViewFile || onCopyLink) && <div className="border-t border-gray-100 my-1" />}

      <button
        type="button"
        className={itemClass}
        onClick={() => { onRename(file); onClose(); }}
        role="menuitem"
      >
        <PenLine className="w-4 h-4 text-gray-500" />
        Rename File
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => { onMove(file); onClose(); }}
        role="menuitem"
      >
        <FolderInput className="w-4 h-4 text-gray-500" />
        Move to...
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => { onCopy(file); onClose(); }}
        role="menuitem"
      >
        <Copy className="w-4 h-4 text-gray-500" />
        Copy to...
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => { onViewSEO(file); onClose(); }}
        role="menuitem"
      >
        <FileSearch className="w-4 h-4 text-gray-500" />
        View SEO Info
      </button>

      <div className="border-t border-gray-100 my-1" />

      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
        onClick={() => { onDelete(file); onClose(); }}
        role="menuitem"
      >
        <Trash2 className="w-4 h-4" />
        Delete File
      </button>
    </div>
  );
});

export default FileContextMenu;
