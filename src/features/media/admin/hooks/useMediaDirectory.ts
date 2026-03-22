/**
 * useMediaDirectory - Core hook for admin media directory browsing
 *
 * Provides directory listing, navigation state, and mutation actions
 * for the admin media manager page.
 *
 * Follows canonical patterns from:
 * - useListingData (GET fetching, credentials: 'include', useCallback, loading/error state)
 * - useListingUpdate (fetchWithCsrf for mutations, isActing state, clearError)
 *
 * @module src/features/media/admin/hooks/useMediaDirectory.ts
 * @tier ADVANCED
 * @phase Phase 4A - Admin Media Manager Core
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type {
  DirectoryListing,
  DirectoryStatistics,
  DirectoryEntry,
} from '@features/media/directory/types/directory-types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseMediaDirectoryReturn {
  // State
  listing: DirectoryListing | null;
  statistics: DirectoryStatistics | null;
  isLoading: boolean;
  isActing: boolean;
  error: string | null;
  currentPath: string;
  viewMode: 'grid' | 'list';
  searchQuery: string;

  // Multi-select state (Phase 4B)
  selectedIds: Set<number>;

  // Computed
  breadcrumbs: Array<{ label: string; path: string }>;
  filteredEntries: DirectoryEntry[];
  folders: DirectoryEntry[];
  files: DirectoryEntry[];

  // Multi-select computed (Phase 4B)
  isAllSelected: boolean;

  // Actions
  navigateTo: (_path: string) => void;
  goUp: () => void;
  createFolder: (_name: string) => Promise<void>;
  renameFolder: (_folderPath: string, _newName: string) => Promise<void>;
  deleteFolder: (_folderPath: string) => Promise<void>;
  deleteFile: (_fileId: number) => Promise<void>;
  renameFile: (_fileId: number, _newFilename: string) => Promise<void>;
  moveFile: (_fileId: number, _destinationPath: string) => Promise<void>;
  refreshDirectory: () => Promise<void>;
  setViewMode: (_mode: 'grid' | 'list') => void;
  setSearchQuery: (_query: string) => void;
  clearError: () => void;

  // Multi-select actions (Phase 4B)
  toggleSelect: (_fileId: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build URL for directory listing API.
 * Root uses /api/admin/media/directory
 * Subdirectory uses /api/admin/media/directory/{encodedPath}
 */
function buildDirectoryUrl(path: string): string {
  if (!path) {
    return '/api/admin/media/directory';
  }
  // Encode each path segment individually to preserve separators
  const encoded = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/api/admin/media/directory/${encoded}`;
}

/**
 * Compute breadcrumbs from a path string.
 * E.g. "listings/123/gallery" → [root, listings, 123, gallery]
 */
function computeBreadcrumbs(currentPath: string): Array<{ label: string; path: string }> {
  const crumbs: Array<{ label: string; path: string }> = [
    { label: 'Media Root', path: '' },
  ];

  if (!currentPath) return crumbs;

  const segments = currentPath.split('/').filter(Boolean);
  let cumulative = '';

  for (const segment of segments) {
    cumulative = cumulative ? `${cumulative}/${segment}` : segment;
    crumbs.push({ label: segment, path: cumulative });
  }

  return crumbs;
}

/**
 * Extract error message from API response or Error object.
 */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const result = await response.json();
    return result.error?.message || result.message || fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useMediaDirectory - Core data-fetching + mutation hook for directory browsing
 *
 * @returns State, computed values, and action functions for media directory management
 */
export function useMediaDirectory(): UseMediaDirectoryReturn {
  // ------ State ------
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [statistics, setStatistics] = useState<DirectoryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Multi-select state (Phase 4B)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ------ Load directory ------

  const loadDirectory = useCallback(async (path: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const url = buildDirectoryUrl(path);
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Failed to load directory');
        setError(message);
        setListing(null);
        return;
      }

      const result = await response.json();
      const listingData: DirectoryListing = result.data?.listing ?? result.listing;

      if (!listingData) {
        setError('No listing data returned');
        setListing(null);
        return;
      }

      setListing(listingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      setListing(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------ Load statistics ------

  const loadStatistics = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/media/statistics?format=directory', {
        credentials: 'include',
      });

      if (!response.ok) return;

      const result = await response.json();
      const statsData: DirectoryStatistics = result.data?.statistics ?? result.statistics;

      if (statsData) {
        setStatistics(statsData);
      }
    } catch {
      // Statistics failure is non-fatal - don't set error state
    }
  }, []);

  // ------ Effects ------

  useEffect(() => {
    void loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  // ------ Navigation ------

  const navigateTo = useCallback((path: string): void => {
    setCurrentPath(path);
    setSearchQuery('');
    setSelectedIds(new Set()); // Clear selection on navigation (Phase 4B)
  }, []);

  const goUp = useCallback((): void => {
    if (!currentPath) return;
    const segments = currentPath.split('/').filter(Boolean);
    segments.pop();
    setCurrentPath(segments.join('/'));
    setSearchQuery('');
  }, [currentPath]);

  const refreshDirectory = useCallback(async (): Promise<void> => {
    await loadDirectory(currentPath);
    await loadStatistics();
  }, [currentPath, loadDirectory, loadStatistics]);

  // ------ Folder mutations ------

  const createFolder = useCallback(
    async (name: string): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const response = await fetchWithCsrf('/api/admin/media/directory', {
          method: 'POST',
          body: JSON.stringify({ parentPath: currentPath, name }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to create folder');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
        await loadStatistics();
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory, loadStatistics]
  );

  const renameFolder = useCallback(
    async (folderPath: string, newName: string): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const encoded = folderPath
          .split('/')
          .map((s) => encodeURIComponent(s))
          .join('/');

        const response = await fetchWithCsrf(`/api/admin/media/directory/${encoded}`, {
          method: 'PUT',
          body: JSON.stringify({ newName }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to rename folder');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
        await loadStatistics();
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory, loadStatistics]
  );

  const deleteFolder = useCallback(
    async (folderPath: string): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const encoded = folderPath
          .split('/')
          .map((s) => encodeURIComponent(s))
          .join('/');

        const response = await fetchWithCsrf(`/api/admin/media/directory/${encoded}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to delete folder');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
        await loadStatistics();
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory, loadStatistics]
  );

  // ------ File mutations ------

  const deleteFile = useCallback(
    async (fileId: number): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(`/api/admin/media/file/${fileId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to delete file');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
        await loadStatistics();
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory, loadStatistics]
  );

  const renameFile = useCallback(
    async (fileId: number, newFilename: string): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(`/api/admin/media/file/${fileId}`, {
          method: 'PUT',
          body: JSON.stringify({ newFilename }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to rename file');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory]
  );

  const moveFile = useCallback(
    async (fileId: number, destinationPath: string): Promise<void> => {
      setIsActing(true);
      setError(null);

      try {
        const response = await fetchWithCsrf(`/api/admin/media/file/${fileId}/move`, {
          method: 'POST',
          body: JSON.stringify({ destinationPath }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(response, 'Failed to move file');
          setError(message);
          throw new Error(message);
        }

        await loadDirectory(currentPath);
        await loadStatistics();
      } finally {
        setIsActing(false);
      }
    },
    [currentPath, loadDirectory, loadStatistics]
  );

  // ------ Computed values (memoized) ------

  const breadcrumbs = useMemo(() => computeBreadcrumbs(currentPath), [currentPath]);

  const filteredEntries = useMemo((): DirectoryEntry[] => {
    if (!listing) return [];
    if (!searchQuery.trim()) return listing.entries;

    const query = searchQuery.toLowerCase();
    return listing.entries.filter((entry) =>
      entry.name.toLowerCase().includes(query)
    );
  }, [listing, searchQuery]);

  const folders = useMemo(
    () => filteredEntries.filter((e) => e.type === 'folder'),
    [filteredEntries]
  );

  const files = useMemo(
    () => filteredEntries.filter((e) => e.type === 'file'),
    [filteredEntries]
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ------ Multi-select actions (Phase 4B) ------

  const toggleSelect = useCallback((fileId: number): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((): void => {
    const allFileIds = filteredEntries
      .filter((e) => e.type === 'file' && e.mediaFileId !== undefined)
      .map((e) => e.mediaFileId!);
    setSelectedIds(new Set(allFileIds));
  }, [filteredEntries]);

  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  // ------ Multi-select computed (Phase 4B) ------

  const isAllSelected = useMemo((): boolean => {
    const fileEntries = files.filter((f) => f.mediaFileId !== undefined);
    return fileEntries.length > 0 && fileEntries.every((f) => selectedIds.has(f.mediaFileId!));
  }, [files, selectedIds]);

  // ------ Return ------

  return {
    // State
    listing,
    statistics,
    isLoading,
    isActing,
    error,
    currentPath,
    viewMode,
    searchQuery,

    // Multi-select state (Phase 4B)
    selectedIds,

    // Computed
    breadcrumbs,
    filteredEntries,
    folders,
    files,

    // Multi-select computed (Phase 4B)
    isAllSelected,

    // Actions
    navigateTo,
    goUp,
    createFolder,
    renameFolder,
    deleteFolder,
    deleteFile,
    renameFile,
    moveFile,
    refreshDirectory,
    setViewMode,
    setSearchQuery,
    clearError,

    // Multi-select actions (Phase 4B)
    toggleSelect,
    selectAll,
    clearSelection,
  };
}

export default useMediaDirectory;
