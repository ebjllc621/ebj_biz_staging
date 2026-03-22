/**
 * FileCardActionMenu - Kebab dropdown menu for file card actions
 *
 * Displays a three-dot button in the upper-right corner of file cards.
 * On click, opens a compact dropdown with all file actions:
 * View, Edit (crop), Copy Link, SEO, Move, Rename, Delete.
 *
 * Pattern: Replicated from SortableGalleryCard action overlay + FileContextMenu actions.
 *
 * @tier STANDARD
 * @phase Phase 5 - Enhanced File Actions
 */

'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreVertical,
  Eye,
  Pencil,
  Link,
  FileSearch,
  FolderInput,
  PenLine,
  Trash2,
} from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface FileCardActionMenuProps {
  entry: DirectoryEntry;
  isImage: boolean;
  onView: (entry: DirectoryEntry) => void;
  onEdit: (entry: DirectoryEntry) => void;
  onCopyLink: (entry: DirectoryEntry) => void;
  onEditSEO: (entry: DirectoryEntry) => void;
  onMove: (entry: DirectoryEntry) => void;
  onRename: (entry: DirectoryEntry) => void;
  onDelete: (entry: DirectoryEntry) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FileCardActionMenu = memo(function FileCardActionMenu({
  entry,
  isImage,
  onView,
  onEdit,
  onCopyLink,
  onEditSEO,
  onMove,
  onRename,
  onDelete,
}: FileCardActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Viewport boundary adjustment
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.right = '0';
      menuRef.current.style.left = 'auto';
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.bottom = '100%';
      menuRef.current.style.top = 'auto';
    }
  }, [isOpen]);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (action: (entry: DirectoryEntry) => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsOpen(false);
      action(entry);
    },
    [entry]
  );

  const itemClass =
    'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap';

  return (
    <div className="relative">
      {/* Kebab trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className={[
          'p-1 rounded bg-white/90 shadow-sm transition-all',
          'hover:bg-orange-50 text-gray-500 hover:text-orange-600',
          isOpen ? 'bg-orange-50 text-orange-600' : '',
        ].join(' ')}
        aria-label={`Actions for ${entry.name}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
          role="menu"
          aria-label={`Actions for ${entry.name}`}
        >
          {/* View */}
          <button
            type="button"
            className={itemClass}
            onClick={handleAction(onView)}
            role="menuitem"
          >
            <Eye className="w-3.5 h-3.5 text-gray-400" />
            View
          </button>

          {/* Edit (crop) - images only */}
          {isImage && (
            <button
              type="button"
              className={itemClass}
              onClick={handleAction(onEdit)}
              role="menuitem"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
              Edit
            </button>
          )}

          {/* Copy Link */}
          <button
            type="button"
            className={itemClass}
            onClick={handleAction(onCopyLink)}
            role="menuitem"
          >
            <Link className="w-3.5 h-3.5 text-gray-400" />
            Copy Link
          </button>

          {/* SEO */}
          <button
            type="button"
            className={itemClass}
            onClick={handleAction(onEditSEO)}
            role="menuitem"
          >
            <FileSearch className="w-3.5 h-3.5 text-gray-400" />
            SEO
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Move */}
          <button
            type="button"
            className={itemClass}
            onClick={handleAction(onMove)}
            role="menuitem"
          >
            <FolderInput className="w-3.5 h-3.5 text-gray-400" />
            Move
          </button>

          {/* Rename */}
          <button
            type="button"
            className={itemClass}
            onClick={handleAction(onRename)}
            role="menuitem"
          >
            <PenLine className="w-3.5 h-3.5 text-gray-400" />
            Rename
          </button>

          <div className="border-t border-gray-100 my-1" />

          {/* Delete */}
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
            onClick={handleAction(onDelete)}
            role="menuitem"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
});

FileCardActionMenu.displayName = 'FileCardActionMenu';

export default FileCardActionMenu;
