/**
 * DirectoryTree - Recursive folder tree sidebar for media browser
 *
 * Renders a hierarchical folder tree with lazy loading.
 * Each folder fetches its children on expand (not all at once).
 *
 * Pattern reference: AdminSidebar recursive MenuItem component
 * - openGroups: Record<string, boolean> for expand state
 * - ChevronDown/ChevronRight animation for open state
 * - Active item: bg-orange-50, text-orange-700, border-l
 * - Indented children with left border
 *
 * @tier ADVANCED
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Folder, FolderOpen, ChevronRight } from 'lucide-react';
import type { DirectoryEntry } from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface DirectoryTreeProps {
  activePath: string;
  onNavigate: (_path: string) => void;
  refreshTrigger?: number;
}

interface TreeNodeProps {
  entry: DirectoryEntry;
  activePath: string;
  depth: number;
  onNavigate: (_path: string) => void;
  expandedPaths: Set<string>;
  treeData: Map<string, DirectoryEntry[]>;
  loadingPath: string | null;
  onToggleExpand: (_path: string) => void;
  onLoadChildren: (_path: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build the directory listing URL for the tree (folders only needed).
 */
function buildTreeUrl(path: string): string {
  if (!path) return '/api/admin/media/directory';
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  return `/api/admin/media/directory/${encoded}`;
}

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

const TreeNode = memo(function TreeNode({
  entry,
  activePath,
  depth,
  onNavigate,
  expandedPaths,
  treeData,
  loadingPath,
  onToggleExpand,
  onLoadChildren,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(entry.path);
  const isActive = activePath === entry.path;
  const isLoading = loadingPath === entry.path;
  const children = treeData.get(entry.path) ?? [];
  // Show chevron if sub-folders are loaded, or if not yet fetched (might have sub-folders).
  // childCount undefined = unknown (Cloudinary folders skip count to save API calls).
  const isFetched = treeData.has(entry.path);
  const hasChildren = children.length > 0 || (!isFetched && entry.childCount !== 0);

  // Indent level: pl-3 for depth 0, pl-6 for depth 1, etc.
  const paddingLeft = 12 + depth * 16;

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isExpanded && !treeData.has(entry.path)) {
        onLoadChildren(entry.path);
      }
      onToggleExpand(entry.path);
    },
    [entry.path, isExpanded, treeData, onLoadChildren, onToggleExpand]
  );

  const handleFolderClick = useCallback(() => {
    onNavigate(entry.path);
    // Also expand if not already expanded
    if (!isExpanded && !treeData.has(entry.path)) {
      onLoadChildren(entry.path);
    }
    if (!isExpanded) {
      onToggleExpand(entry.path);
    }
  }, [entry.path, isExpanded, treeData, onNavigate, onLoadChildren, onToggleExpand]);

  return (
    <div>
      {/* Folder row */}
      <div
        className={`
          flex items-center gap-1 py-1.5 pr-2 rounded-md cursor-pointer select-none transition-colors
          ${isActive
            ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-500'
            : 'text-gray-700 hover:bg-gray-50 border-l-2 border-transparent'
          }
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleFolderClick}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-current={isActive ? 'page' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFolderClick();
          }
        }}
      >
        {/* Chevron toggle */}
        <button
          type="button"
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={handleChevronClick}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          tabIndex={-1}
        >
          {hasChildren ? (
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Folder icon */}
        <span className="flex-shrink-0">
          {isLoading ? (
            <span className="w-4 h-4 inline-block animate-spin border-2 border-orange-400 border-t-transparent rounded-full" />
          ) : isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <Folder className="w-4 h-4 text-blue-400" />
          )}
        </span>

        {/* Folder name */}
        <span className="text-sm truncate flex-1" title={entry.name}>
          {entry.name}
        </span>

        {/* Child count badge (when collapsed and has children) */}
        {!isExpanded && (entry.childCount ?? 0) > 0 && (
          <span className="flex-shrink-0 text-xs text-gray-400 ml-1">
            {entry.childCount}
          </span>
        )}
      </div>

      {/* Children (when expanded) */}
      {isExpanded && children.length > 0 && (
        <div className="ml-2 border-l border-gray-100">
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              activePath={activePath}
              depth={depth + 1}
              onNavigate={onNavigate}
              expandedPaths={expandedPaths}
              treeData={treeData}
              loadingPath={loadingPath}
              onToggleExpand={onToggleExpand}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}

      {/* Empty expanded folder indication - only show when folder is truly empty (childCount explicitly 0) */}
      {isExpanded && children.length === 0 && !isLoading && isFetched && entry.childCount === 0 && (
        <div
          className="text-xs text-gray-400 italic py-1 ml-2 border-l border-gray-100"
          style={{ paddingLeft: `${paddingLeft + 20}px` }}
        >
          Empty folder
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DirectoryTree - Lazy-loaded recursive folder tree sidebar
 *
 * Fetches root folders on mount, then fetches children lazily on expand.
 */
export function DirectoryTree({ activePath, onNavigate, refreshTrigger }: DirectoryTreeProps) {
  const [rootFolders, setRootFolders] = useState<DirectoryEntry[]>([]);
  const [treeData, setTreeData] = useState<Map<string, DirectoryEntry[]>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);

  // Ref to track current treeData without triggering callback recreation
  const treeDataRef = useRef(treeData);
  treeDataRef.current = treeData;

  // ------ Load children for a given folder path ------

  const loadChildren = useCallback(async (folderPath: string): Promise<void> => {
    if (treeDataRef.current.has(folderPath)) return; // Already loaded

    setLoadingPath(folderPath);

    try {
      const url = buildTreeUrl(folderPath);
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) return;

      const result = await response.json();
      const listing = result.data?.listing ?? result.listing;

      if (!listing?.entries) return;

      const folders = (listing.entries as DirectoryEntry[]).filter(
        (e) => e.type === 'folder'
      );

      setTreeData((prev) => new Map(prev).set(folderPath, folders));
    } catch {
      // Non-fatal: just don't expand
    } finally {
      setLoadingPath(null);
    }
  }, []);

  // ------ Load root on mount / refreshTrigger ------

  const loadRoot = useCallback(async (): Promise<void> => {
    setIsLoadingRoot(true);

    try {
      const response = await fetch('/api/admin/media/directory', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const result = await response.json();
      const listing = result.data?.listing ?? result.listing;

      if (!listing?.entries) return;

      const folders = (listing.entries as DirectoryEntry[]).filter(
        (e) => e.type === 'folder'
      );

      setRootFolders(folders);
      // Clear cached tree data on refresh so children are re-fetched
      setTreeData(new Map());
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingRoot(false);
    }
  }, []);

  useEffect(() => {
    void loadRoot();
  }, [loadRoot, refreshTrigger]);

  // ------ Auto-expand active path ancestors ------

  useEffect(() => {
    if (!activePath) return;

    const segments = activePath.split('/').filter(Boolean);
    const ancestorPaths = segments.map((_, i) =>
      segments.slice(0, i + 1).join('/')
    );

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      ancestorPaths.forEach((p) => next.add(p));
      return next;
    });

    // Load children for ancestor paths that haven't been fetched yet
    for (const ancestorPath of ancestorPaths) {
      if (!treeDataRef.current.has(ancestorPath)) {
        void loadChildren(ancestorPath);
      }
    }
  }, [activePath, loadChildren]);

  // ------ Toggle expand ------

  const handleToggleExpand = useCallback((path: string): void => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // ------ Render ------

  if (isLoadingRoot) {
    return (
      <div className="p-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 bg-gray-100 rounded animate-pulse mb-1" />
        ))}
      </div>
    );
  }

  if (rootFolders.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 italic">
        No folders found
      </div>
    );
  }

  return (
    <div className="py-2 px-1">
      {/* Root level: "All Files" entry */}
      <div
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer select-none transition-colors mb-1
          ${activePath === ''
            ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-500'
            : 'text-gray-700 hover:bg-gray-50 border-l-2 border-transparent'
          }
        `}
        onClick={() => onNavigate('')}
        role="button"
        tabIndex={0}
        aria-current={activePath === '' ? 'page' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigate('');
          }
        }}
      >
        <FolderOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <span className="text-sm font-medium">All Files</span>
      </div>

      <div className="border-t border-gray-100 pt-1">
        {rootFolders.map((folder) => (
          <TreeNode
            key={folder.path}
            entry={folder}
            activePath={activePath}
            depth={0}
            onNavigate={onNavigate}
            expandedPaths={expandedPaths}
            treeData={treeData}
            loadingPath={loadingPath}
            onToggleExpand={handleToggleExpand}
            onLoadChildren={loadChildren}
          />
        ))}
      </div>
    </div>
  );
}

export default DirectoryTree;
