/**
 * FolderContextMenu - Right-click context menu for folder entries
 *
 * Pattern: MessageContextMenu (fixed position via x/y props, click-outside via mousedown,
 * Escape key listener, viewport boundary adjustment via getBoundingClientRect).
 *
 * @tier SIMPLE
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { memo, useRef, useEffect } from 'react';
import { Trash2, PenLine, FolderPlus } from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface FolderContextMenuProps {
  x: number;
  y: number;
  folder: DirectoryEntry;
  onClose: () => void;
  onDelete: (_folder: DirectoryEntry) => void;
  onRename: (_folder: DirectoryEntry) => void;
  onCreateSubfolder: (_parentPath: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FolderContextMenu = memo(function FolderContextMenu({
  x,
  y,
  folder,
  onClose,
  onDelete,
  onRename,
  onCreateSubfolder,
}: FolderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
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
      aria-label={`Actions for ${folder.name}`}
    >
      <button
        type="button"
        className={itemClass}
        onClick={() => { onCreateSubfolder(folder.path); onClose(); }}
        role="menuitem"
      >
        <FolderPlus className="w-4 h-4 text-gray-500" />
        Create Subfolder
      </button>

      <button
        type="button"
        className={itemClass}
        onClick={() => { onRename(folder); onClose(); }}
        role="menuitem"
      >
        <PenLine className="w-4 h-4 text-gray-500" />
        Rename Folder
      </button>

      <div className="border-t border-gray-100 my-1" />

      <button
        type="button"
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 transition-colors"
        onClick={() => { onDelete(folder); onClose(); }}
        role="menuitem"
      >
        <Trash2 className="w-4 h-4" />
        Delete Folder
      </button>
    </div>
  );
});

export default FolderContextMenu;
