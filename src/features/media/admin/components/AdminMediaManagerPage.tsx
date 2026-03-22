/**
 * AdminMediaManagerPage - Main admin media browser page component
 *
 * ENTERPRISE tier component: full admin page with three-panel layout.
 * - Left sidebar: DirectoryTree (folder hierarchy)
 * - Main area: DirectoryBreadcrumb + MediaManagerToolbar + FileGrid/FileList
 * - Right sidebar: AdminStatsPanel with directory statistics
 *
 * Phase 4B additions:
 * - Multi-select with BatchOperationsToolbar
 * - Right-click context menus (FileContextMenu, FolderContextMenu)
 * - MoveItemModal for move/copy destination selection
 * - BatchProgressModal for operation progress/results
 * - BulkSEOEditModal for bulk metadata editing
 * - AdminPasswordModal gates batch delete
 *
 * Auth guard: useAuth() called AFTER all hooks per React Rules of Hooks.
 * ErrorBoundary wraps page content (ENTERPRISE tier requirement).
 *
 * @tier ENTERPRISE
 * @phase Phase 4B - Batch Operations + SEO + Context Menus
 */

'use client';

import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { AdminStatsPanel } from '@/components/admin/shared/AdminStatsPanel';
import { AdminPasswordModal } from '@/components/admin/shared/AdminPasswordModal';
import BizModal, { BizModalButton } from '@/components/BizModal';
import { UploadDropZone } from '@features/media/upload';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { useMediaDirectory } from '../hooks/useMediaDirectory';
import { DirectoryBreadcrumb } from './DirectoryBreadcrumb';
import { DirectoryTree } from './DirectoryTree';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { MediaManagerToolbar } from './MediaManagerToolbar';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CreateFolderModal } from './CreateFolderModal';
import { RenameFolderModal } from './RenameFolderModal';
import { FileContextMenu } from './FileContextMenu';
import { FolderContextMenu } from './FolderContextMenu';
import { BatchOperationsToolbar } from './BatchOperationsToolbar';
import { MoveItemModal } from './MoveItemModal';
import { BatchProgressModal } from './BatchProgressModal';
import { BulkSEOEditModalWithReset } from './BulkSEOEditModal';
import type { SEOUpdateEntry } from './BulkSEOEditModal';
import type { DirectoryEntry, BatchOperationResult } from '@features/media/directory/types/directory-types';
import type { StatSection } from '@/components/admin/shared/AdminStatsPanel';

// Lazy-load cropper modal (ENTERPRISE pattern from GalleryManager)
const EnhancedImageCropperModal = lazy(
  () => import('@features/listings/components/NewListingModal/shared/ImageCropper/EnhancedImageCropperModal')
);

// ============================================================================
// TYPES
// ============================================================================

interface DeleteTarget {
  name: string;
  type: 'file' | 'folder';
  fileId?: number;
  folderPath?: string;
}

interface RenameFolderTarget {
  currentName: string;
  folderPath: string;
}

interface ContextMenuState {
  type: 'file' | 'folder';
  entry: DirectoryEntry;
  x: number;
  y: number;
}

interface MoveTargetState {
  operation: 'move' | 'copy';
  fileIds: number[];
}

interface BatchProgressState {
  operation: 'delete' | 'move' | 'copy' | 'seo-update';
  result: BatchOperationResult | null;
  isProcessing: boolean;
}

// ============================================================================
// ERROR FALLBACK
// ============================================================================

function MediaManagerErrorFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Media Manager Error</p>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. Please refresh the page.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STATISTICS PANEL BUILDER
// ============================================================================

function buildStatsSections(
  statistics: ReturnType<typeof useMediaDirectory>['statistics']
): StatSection[] {
  if (!statistics) return [];

  const byType = statistics.filesByType ?? {};
  const imageCount = byType['image'] ?? 0;
  const videoCount = byType['video'] ?? 0;
  const documentCount = byType['document'] ?? 0;
  const otherCount =
    statistics.totalFiles - imageCount - videoCount - documentCount;

  return [
    {
      title: 'Overview',
      items: [
        { label: 'Files', value: statistics.totalFiles, bold: true },
        { label: 'Folders', value: statistics.totalFolders },
        { label: 'Total Size', value: `${statistics.totalSizeMB} MB` },
      ],
    },
    {
      title: 'By Type',
      items: [
        { label: 'Images', value: imageCount },
        { label: 'Videos', value: videoCount },
        { label: 'Docs', value: documentCount },
        { label: 'Other', value: Math.max(0, otherCount) },
      ],
    },
    {
      title: 'SEO Health',
      items: [
        { label: 'Missing Alt', value: statistics.missingAltTextCount },
        { label: 'Coverage', value: `${statistics.seoHealthPercent}%`, bold: true },
      ],
    },
  ];
}

// ============================================================================
// INNER PAGE CONTENT (wrapped by ErrorBoundary)
// ============================================================================

function AdminMediaManagerPageContent() {
  const directory = useMediaDirectory();

  // Auth guard - AFTER all hooks per React Rules of Hooks
  const { user } = useAuth();

  // ------ Existing modal state ------
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<RenameFolderTarget | null>(null);
  const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);
  const renameFileTargetRef = useRef<DirectoryEntry | null>(null);
  const [renameFileOpen, setRenameFileOpen] = useState(false);

  // ------ Upload modal state ------
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSelectedFile, setUploadSelectedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadTitleText, setUploadTitleText] = useState('');

  // ------ Phase 4B state ------
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTargetState | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const [bulkSEOOpen, setBulkSEOOpen] = useState(false);
  const [bulkSEOFiles, setBulkSEOFiles] = useState<DirectoryEntry[]>([]);
  const [passwordGateOpen, setPasswordGateOpen] = useState(false);
  const [pendingBatchDelete, setPendingBatchDelete] = useState<number[] | null>(null);

  // ------ Phase 5 state: Enhanced file actions ------
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [cropperFileEntry, setCropperFileEntry] = useState<DirectoryEntry | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // ------ Upload modal handlers ------

  const handleUploadModalClose = useCallback(() => {
    if (isUploading) return; // Don't close while uploading
    setUploadModalOpen(false);
    setUploadSelectedFile(null);
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadPreviewUrl(null);
    setUploadProgress(0);
    setUploadError(null);
    setUploadComplete(false);
    setUploadAltText('');
    setUploadTitleText('');
  }, [isUploading, uploadPreviewUrl]);

  const handleUploadFileSelect = useCallback((file: File) => {
    // Revoke previous preview URL if any
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadSelectedFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
    setUploadError(null);
    setUploadComplete(false);
  }, [uploadPreviewUrl]);

  const handleUploadClearFile = useCallback(() => {
    setUploadSelectedFile(null);
    if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    setUploadPreviewUrl(null);
    setUploadError(null);
  }, [uploadPreviewUrl]);

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadSelectedFile || !uploadAltText.trim()) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadSelectedFile);
      formData.append('directoryPath', directory.currentPath);
      formData.append('altText', uploadAltText.trim());
      if (uploadTitleText.trim()) {
        formData.append('titleText', uploadTitleText.trim());
      }

      setUploadProgress(30);

      const response = await fetchWithCsrf('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || `Upload failed (${response.status})`);
      }

      setUploadProgress(100);

      // Check Cloudinary backup status for local-primary directories
      const backupStatus = result?.data?.cloudinaryBackup;
      if (backupStatus === 'failed') {
        setUploadError('File saved locally, but Cloudinary backup failed. Check server logs.');
      }
      setUploadComplete(true);

      // Refresh directory after upload
      await directory.refreshDirectory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(message);
      console.error('[MediaManager] Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [uploadSelectedFile, uploadAltText, uploadTitleText, directory]);

  // ------ Existing handlers ------

  const handleFolderClick = useCallback((folder: DirectoryEntry) => {
    directory.navigateTo(folder.path);
  }, [directory]);

  const handleDeleteFile = useCallback((file: DirectoryEntry) => {
    setDeleteTarget({
      name: file.name,
      type: 'file',
      fileId: file.mediaFileId,
    });
  }, []);

  const handleDeleteFolder = useCallback((folder: DirectoryEntry) => {
    setDeleteTarget({
      name: folder.name,
      type: 'folder',
      folderPath: folder.path,
    });
  }, []);

  const handleRenameFile = useCallback((file: DirectoryEntry) => {
    renameFileTargetRef.current = file;
    setRenameFileOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'file' && deleteTarget.fileId !== undefined) {
        await directory.deleteFile(deleteTarget.fileId);
      } else if (deleteTarget.type === 'folder' && deleteTarget.folderPath) {
        await directory.deleteFolder(deleteTarget.folderPath);
        setTreeRefreshTrigger((n) => n + 1);
      }
      setDeleteTarget(null);
    } catch {
      // Error is set on the hook - keep modal open so user can see
    }
  }, [deleteTarget, directory]);

  const handleCreateFolder = useCallback(async (name: string) => {
    await directory.createFolder(name);
    setTreeRefreshTrigger((n) => n + 1);
  }, [directory]);

  const handleRenameFolder = useCallback(async (newName: string) => {
    if (!renameFolderTarget) return;
    await directory.renameFolder(renameFolderTarget.folderPath, newName);
    setTreeRefreshTrigger((n) => n + 1);
  }, [directory, renameFolderTarget]);

  const handleRenameFileSubmit = useCallback(async (newFilename: string) => {
    const file = renameFileTargetRef.current;
    if (!file?.mediaFileId) return;
    await directory.renameFile(file.mediaFileId, newFilename);
    renameFileTargetRef.current = null;
  }, [directory]);

  const handleRefresh = useCallback(async () => {
    await directory.refreshDirectory();
    setTreeRefreshTrigger((n) => n + 1);
  }, [directory]);

  // ------ Phase 4B handlers ------

  // Context menu handlers
  const handleFileContextMenu = useCallback(
    (file: DirectoryEntry, x: number, y: number) => {
      setContextMenu({ type: 'file', entry: file, x, y });
    },
    []
  );

  const handleFolderContextMenu = useCallback(
    (folder: DirectoryEntry, x: number, y: number) => {
      setContextMenu({ type: 'folder', entry: folder, x, y });
    },
    []
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Context menu action routing
  const handleContextMenuDelete = useCallback((entry: DirectoryEntry) => {
    if (entry.type === 'file') {
      handleDeleteFile(entry);
    } else {
      handleDeleteFolder(entry);
    }
  }, [handleDeleteFile, handleDeleteFolder]);

  const handleContextMenuRename = useCallback((entry: DirectoryEntry) => {
    if (entry.type === 'file') {
      handleRenameFile(entry);
    } else {
      // Find the parent path for folder rename
      const pathParts = entry.path.split('/');
      const currentName = pathParts[pathParts.length - 1] ?? entry.name;
      setRenameFolderTarget({ currentName, folderPath: entry.path });
    }
  }, [handleRenameFile]);

  const handleContextMenuMove = useCallback((file: DirectoryEntry) => {
    if (file.mediaFileId === undefined) return;
    setMoveTarget({ operation: 'move', fileIds: [file.mediaFileId] });
  }, []);

  const handleContextMenuCopy = useCallback((file: DirectoryEntry) => {
    if (file.mediaFileId === undefined) return;
    setMoveTarget({ operation: 'copy', fileIds: [file.mediaFileId] });
  }, []);

  const handleContextMenuViewSEO = useCallback((file: DirectoryEntry) => {
    setBulkSEOFiles([file]);
    setBulkSEOOpen(true);
  }, []);

  const handleContextMenuCreateSubfolder = useCallback((_parentPath: string) => {
    // Navigate to the parent path and open create folder modal
    directory.navigateTo(_parentPath);
    setCreateFolderOpen(true);
  }, [directory]);

  // Batch delete - gated through password modal
  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(directory.selectedIds);
    if (ids.length === 0) return;
    setPendingBatchDelete(ids);
    setPasswordGateOpen(true);
  }, [directory.selectedIds]);

  const handleBatchDeleteConfirmed = useCallback(async () => {
    const ids = pendingBatchDelete;
    if (!ids || ids.length === 0) return;

    setPasswordGateOpen(false);
    setPendingBatchDelete(null);

    setBatchProgress({
      operation: 'delete',
      result: null,
      isProcessing: true,
    });

    try {
      const response = await fetchWithCsrf('/api/admin/media/batch', {
        method: 'POST',
        body: JSON.stringify({ fileIds: ids, operation: 'delete' }),
      });

      const data = await response.json();
      const result: BatchOperationResult = data.data?.result ?? data.result;

      setBatchProgress((prev) =>
        prev ? { ...prev, result, isProcessing: false } : null
      );

      // Refresh directory after batch delete
      await directory.refreshDirectory();
      directory.clearSelection();
    } catch (err) {
      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              result: {
                total: ids.length,
                succeeded: 0,
                failed: ids.length,
                errors: ids.map((id) => ({
                  fileId: id,
                  error: err instanceof Error ? err.message : 'Unknown error',
                })),
              },
              isProcessing: false,
            }
          : null
      );
    }
  }, [pendingBatchDelete, directory]);

  // Batch move
  const handleBatchMove = useCallback(() => {
    const ids = Array.from(directory.selectedIds);
    if (ids.length === 0) return;
    setMoveTarget({ operation: 'move', fileIds: ids });
  }, [directory.selectedIds]);

  // Batch copy
  const handleBatchCopy = useCallback(() => {
    const ids = Array.from(directory.selectedIds);
    if (ids.length === 0) return;
    setMoveTarget({ operation: 'copy', fileIds: ids });
  }, [directory.selectedIds]);

  // Confirm move/copy from MoveItemModal
  const handleMoveConfirm = useCallback(
    async (destinationPath: string) => {
      if (!moveTarget) return;

      const operation = moveTarget.operation;
      const ids = moveTarget.fileIds;

      setMoveTarget(null);
      setBatchProgress({
        operation,
        result: null,
        isProcessing: true,
      });

      try {
        const response = await fetchWithCsrf('/api/admin/media/batch', {
          method: 'POST',
          body: JSON.stringify({
            fileIds: ids,
            operation,
            destinationPath,
          }),
        });

        const data = await response.json();
        const result: BatchOperationResult = data.data?.result ?? data.result;

        setBatchProgress((prev) =>
          prev ? { ...prev, result, isProcessing: false } : null
        );

        await directory.refreshDirectory();
        directory.clearSelection();
      } catch (err) {
        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                result: {
                  total: ids.length,
                  succeeded: 0,
                  failed: ids.length,
                  errors: ids.map((id) => ({
                    fileId: id,
                    error: err instanceof Error ? err.message : 'Unknown error',
                  })),
                },
                isProcessing: false,
              }
            : null
        );
      }
    },
    [moveTarget, directory]
  );

  // Bulk SEO from toolbar (selected files)
  const handleBulkSEOOpen = useCallback(() => {
    const selectedFiles = directory.files.filter(
      (f) => directory.selectedIds.has(f.mediaFileId ?? -1)
    );
    setBulkSEOFiles(selectedFiles.length > 0 ? selectedFiles : directory.files);
    setBulkSEOOpen(true);
  }, [directory.files, directory.selectedIds]);

  // Save bulk SEO edits
  const handleBulkSEOSave = useCallback(
    async (updates: SEOUpdateEntry[]) => {
      setBatchProgress({
        operation: 'seo-update',
        result: null,
        isProcessing: true,
      });
      setBulkSEOOpen(false);

      try {
        // Map updates to the API format, including filePath/fileUrl for auto-registration
        const apiUpdates = updates.map((u) => ({
          fileId: u.fileId,
          filePath: u.filePath,
          fileUrl: u.fileUrl,
          altText: u.altText,
          titleText: u.titleText,
        }));

        const response = await fetchWithCsrf('/api/admin/media/seo', {
          method: 'PUT',
          body: JSON.stringify({ updates: apiUpdates }),
        });

        const data = await response.json();
        const result: BatchOperationResult = data.data?.result ?? data.result;

        setBatchProgress((prev) =>
          prev ? { ...prev, result, isProcessing: false } : null
        );

        await directory.refreshDirectory();
      } catch (err) {
        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                result: {
                  total: updates.length,
                  succeeded: 0,
                  failed: updates.length,
                  errors: updates.map((u) => ({
                    fileId: u.fileId ?? 0,
                    error: err instanceof Error ? err.message : 'Unknown error',
                  })),
                },
                isProcessing: false,
              }
            : null
        );
      }
    },
    [directory]
  );

  // ------ Phase 5: Enhanced file action handlers ------

  // Clipboard helper (replicated from GalleryGrid)
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyToast(label);
      setTimeout(() => setCopyToast(null), 2000);
    } catch {
      setCopyToast('Copy failed');
      setTimeout(() => setCopyToast(null), 2000);
    }
  }, []);

  // View file - open in new tab
  const handleViewFile = useCallback((file: DirectoryEntry) => {
    if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Edit file (crop) - open cropper modal for images
  const handleEditFile = useCallback((file: DirectoryEntry) => {
    if (file.url && (file.mimeType ?? '').startsWith('image/')) {
      setCropperImageUrl(file.url);
      setCropperFileEntry(file);
    }
  }, []);

  // Copy link to clipboard
  const handleCopyLink = useCallback((file: DirectoryEntry) => {
    if (file.url) {
      void copyToClipboard(file.url, 'Link copied!');
    }
  }, [copyToClipboard]);

  // Move single file (opens move modal)
  const handleMoveFile = useCallback((file: DirectoryEntry) => {
    if (file.mediaFileId === undefined) return;
    setMoveTarget({ operation: 'move', fileIds: [file.mediaFileId] });
  }, []);

  // View SEO for single file
  const handleEditSEOSingle = useCallback((file: DirectoryEntry) => {
    setBulkSEOFiles([file]);
    setBulkSEOOpen(true);
  }, []);

  // Batch copy links
  const handleBatchCopyLinks = useCallback(() => {
    const selectedFiles = directory.files.filter(
      (f) => f.mediaFileId !== undefined && directory.selectedIds.has(f.mediaFileId)
    );
    const urls = selectedFiles
      .map((f) => f.url)
      .filter((url): url is string => !!url);
    if (urls.length > 0) {
      void copyToClipboard(urls.join('\n'), `${urls.length} link${urls.length > 1 ? 's' : ''} copied!`);
    }
  }, [directory.files, directory.selectedIds, copyToClipboard]);

  // Cropper apply handler
  const handleCropApply = useCallback(
    async (croppedDataUrl: string) => {
      if (!cropperFileEntry?.mediaFileId) return;

      try {
        // Convert data URL to blob
        const response = await fetch(croppedDataUrl);
        const blob = await response.blob();
        const file = new File([blob], cropperFileEntry.name, { type: blob.type });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('directoryPath', directory.currentPath);
        formData.append('altText', cropperFileEntry.altText || cropperFileEntry.name);
        if (cropperFileEntry.titleText) {
          formData.append('titleText', cropperFileEntry.titleText);
        }
        formData.append('replaceFileId', String(cropperFileEntry.mediaFileId));

        await fetchWithCsrf('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });

        await directory.refreshDirectory();
      } catch (err) {
        console.error('[MediaManager] Crop apply failed:', err);
      } finally {
        setCropperImageUrl(null);
        setCropperFileEntry(null);
      }
    },
    [cropperFileEntry, directory]
  );

  // Reorder handler (visual reorder from DnD)
  const handleReorder = useCallback(() => {
    // Currently visual-only reorder within the grid.
    // The directory listing doesn't persist sort order,
    // but the DnD interaction is supported for UX consistency.
  }, []);

  // Context menu: View file
  const handleContextMenuViewFile = useCallback((entry: DirectoryEntry) => {
    handleViewFile(entry);
  }, [handleViewFile]);

  // Context menu: Copy link
  const handleContextMenuCopyLink = useCallback((entry: DirectoryEntry) => {
    handleCopyLink(entry);
  }, [handleCopyLink]);

  // ------ Auth check ------

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 font-medium">
          Access Denied: Admin privileges required
        </div>
      </div>
    );
  }

  // Stats panel sections
  const statsSections = buildStatsSections(directory.statistics);
  const selectedCount = directory.selectedIds.size;

  // ------ Render ------

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-white">
        <AdminPageHeader
          title="Media Manager"
          additionalActions={
            directory.error ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">{directory.error}</span>
                <button
                  type="button"
                  className="text-sm text-orange-600 hover:underline"
                  onClick={directory.clearError}
                >
                  Dismiss
                </button>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Statistics panel (top bar - always visible) */}
      <div className="flex-shrink-0 px-6">
        <AdminStatsPanel
          title="Media Statistics"
          sections={statsSections}
          loading={!directory.statistics}
        />
      </div>

      {/* Three-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Directory Tree */}
        <aside className="hidden lg:flex flex-col w-56 border-r bg-white overflow-y-auto flex-shrink-0">
          <div className="px-3 py-2 border-b">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Folders
            </h2>
          </div>
          <DirectoryTree
            activePath={directory.currentPath}
            onNavigate={directory.navigateTo}
            refreshTrigger={treeRefreshTrigger}
          />
        </aside>

        {/* Main content area */}
        <main className="flex flex-col flex-1 overflow-hidden bg-gray-50">
          {/* Breadcrumb */}
          <div className="flex-shrink-0 px-4 py-2 bg-white border-b">
            <DirectoryBreadcrumb
              breadcrumbs={directory.breadcrumbs}
              onNavigate={directory.navigateTo}
            />
          </div>

          {/* Toolbar */}
          <MediaManagerToolbar
            viewMode={directory.viewMode}
            onViewModeChange={directory.setViewMode}
            searchQuery={directory.searchQuery}
            onSearchChange={directory.setSearchQuery}
            onCreateFolder={() => setCreateFolderOpen(true)}
            onUploadClick={() => setUploadModalOpen(true)}
            onRefresh={() => void handleRefresh()}
            isLoading={directory.isLoading || directory.isActing}
            isUploading={isUploading}
            totalFiles={directory.files.length}
            totalFolders={directory.folders.length}
          />

          {/* File display area */}
          <div className={`flex-1 overflow-y-auto p-4 ${selectedCount > 0 ? 'pb-20' : ''}`}>
            {directory.viewMode === 'grid' ? (
              <FileGrid
                entries={directory.filteredEntries}
                onFolderClick={handleFolderClick}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onDeleteFolder={handleDeleteFolder}
                isLoading={directory.isLoading}
                selectedIds={directory.selectedIds}
                onToggleSelect={directory.toggleSelect}
                onFileContextMenu={handleFileContextMenu}
                onFolderContextMenu={handleFolderContextMenu}
                onViewFile={handleViewFile}
                onEditFile={handleEditFile}
                onCopyLink={handleCopyLink}
                onEditSEO={handleEditSEOSingle}
                onMoveFile={handleMoveFile}
                onReorder={handleReorder}
              />
            ) : (
              <FileList
                entries={directory.filteredEntries}
                onFolderClick={handleFolderClick}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onDeleteFolder={handleDeleteFolder}
                isLoading={directory.isLoading}
                selectedIds={directory.selectedIds}
                onToggleSelect={directory.toggleSelect}
                onFileContextMenu={handleFileContextMenu}
                onFolderContextMenu={handleFolderContextMenu}
              />
            )}
          </div>
        </main>
      </div>

      {/* ================================================================ */}
      {/* EXISTING MODALS                                                  */}
      {/* ================================================================ */}

      <CreateFolderModal
        isOpen={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        onSubmit={handleCreateFolder}
        isCreating={directory.isActing}
      />

      <RenameFolderModal
        isOpen={!!renameFolderTarget}
        onClose={() => setRenameFolderTarget(null)}
        onSubmit={handleRenameFolder}
        currentName={renameFolderTarget?.currentName ?? ''}
        isRenaming={directory.isActing}
      />

      {/* File rename reuses RenameFolderModal with different submit handler */}
      <RenameFolderModal
        isOpen={renameFileOpen}
        onClose={() => {
          setRenameFileOpen(false);
          renameFileTargetRef.current = null;
        }}
        onSubmit={handleRenameFileSubmit}
        currentName={renameFileTargetRef.current?.name ?? ''}
        isRenaming={directory.isActing}
        title="Rename File"
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        itemName={deleteTarget?.name ?? ''}
        itemType={deleteTarget?.type ?? 'file'}
        isDeleting={directory.isActing}
      />

      {/* ================================================================ */}
      {/* UPLOAD MODAL                                                     */}
      {/* ================================================================ */}

      <BizModal
        isOpen={uploadModalOpen}
        onClose={handleUploadModalClose}
        title="Upload Media"
        maxWidth="lg"
        closeOnBackdropClick={false}
        footer={
          uploadComplete ? (
            <div className="flex justify-end">
              <BizModalButton variant="primary" onClick={handleUploadModalClose}>
                Done
              </BizModalButton>
            </div>
          ) : uploadError ? (
            <div className="flex justify-between gap-3">
              <BizModalButton variant="secondary" onClick={() => { setUploadError(null); setUploadComplete(false); }}>
                Try Again
              </BizModalButton>
              <BizModalButton variant="secondary" onClick={handleUploadModalClose}>
                Cancel
              </BizModalButton>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <BizModalButton variant="secondary" onClick={handleUploadModalClose} disabled={isUploading}>
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="primary"
                onClick={() => void handleUploadSubmit()}
                disabled={!uploadSelectedFile || !uploadAltText.trim() || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </BizModalButton>
            </div>
          )
        }
      >
        {uploadComplete ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold text-gray-800">Upload complete!</p>
            <p className="text-sm text-gray-500">Your media has been saved successfully.</p>
          </div>
        ) : uploadError ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold text-gray-800">Upload failed</p>
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        ) : isUploading ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center text-gray-600">Uploading your file...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#ed6437] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress: ${uploadProgress}%`}
              />
            </div>
            <p className="text-xs text-center text-gray-400">{uploadProgress}%</p>
          </div>
        ) : (
          <div className="space-y-5">
            <UploadDropZone
              onFileSelect={handleUploadFileSelect}
              acceptedFormats="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf"
              maxFileSizeMB={50}
              currentPreview={uploadPreviewUrl}
              onClear={handleUploadClearFile}
              disabled={isUploading}
            />

            {uploadSelectedFile && (
              <div className="space-y-3">
                {/* Alt text - required */}
                <div>
                  <label htmlFor="admin-upload-alt-text" className="block text-sm font-semibold text-[#022641] mb-1">
                    Alt text <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="admin-upload-alt-text"
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Describe what is in this image..."
                    maxLength={255}
                    className={[
                      'w-full rounded-md border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent',
                      uploadAltText.trim() ? 'border-gray-300' : 'border-orange-300',
                    ].join(' ')}
                    aria-required="true"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required. Used by screen readers and search engines.
                  </p>
                </div>

                {/* Title text - optional */}
                <div>
                  <label htmlFor="admin-upload-title-text" className="block text-sm font-medium text-gray-700 mb-1">
                    Title text <span className="text-xs font-normal text-gray-400">(optional, max 60 chars)</span>
                  </label>
                  <input
                    id="admin-upload-title-text"
                    type="text"
                    value={uploadTitleText}
                    onChange={(e) => setUploadTitleText(e.target.value)}
                    placeholder="Shown as tooltip on hover..."
                    maxLength={60}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Current directory indicator */}
            <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
              Uploading to: <span className="font-medium text-gray-700">{directory.currentPath || '/ (root)'}</span>
            </p>
          </div>
        )}
      </BizModal>

      {/* ================================================================ */}
      {/* PHASE 4B - CONTEXT MENUS                                        */}
      {/* ================================================================ */}

      {contextMenu?.type === 'file' && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.entry}
          onClose={handleCloseContextMenu}
          onDelete={handleContextMenuDelete}
          onRename={handleContextMenuRename}
          onMove={handleContextMenuMove}
          onCopy={handleContextMenuCopy}
          onViewSEO={handleContextMenuViewSEO}
          onViewFile={handleContextMenuViewFile}
          onCopyLink={handleContextMenuCopyLink}
        />
      )}

      {contextMenu?.type === 'folder' && (
        <FolderContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          folder={contextMenu.entry}
          onClose={handleCloseContextMenu}
          onDelete={handleContextMenuDelete}
          onRename={handleContextMenuRename}
          onCreateSubfolder={handleContextMenuCreateSubfolder}
        />
      )}

      {/* ================================================================ */}
      {/* PHASE 4B - BATCH OPERATIONS TOOLBAR                             */}
      {/* ================================================================ */}

      <BatchOperationsToolbar
        selectedCount={selectedCount}
        onDelete={handleBatchDelete}
        onMove={handleBatchMove}
        onCopy={handleBatchCopy}
        onBulkSEO={handleBulkSEOOpen}
        onCopyLinks={handleBatchCopyLinks}
        onClearSelection={directory.clearSelection}
      />

      {/* ================================================================ */}
      {/* PHASE 4B - MOVE/COPY MODAL                                      */}
      {/* ================================================================ */}

      <MoveItemModal
        isOpen={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        onConfirm={(dest) => void handleMoveConfirm(dest)}
        operation={moveTarget?.operation ?? 'move'}
        itemCount={moveTarget?.fileIds.length ?? 0}
        isProcessing={batchProgress?.isProcessing ?? false}
      />

      {/* ================================================================ */}
      {/* PHASE 4B - BATCH PROGRESS MODAL                                 */}
      {/* ================================================================ */}

      <BatchProgressModal
        isOpen={batchProgress !== null}
        onClose={() => setBatchProgress(null)}
        operation={batchProgress?.operation ?? 'delete'}
        result={batchProgress?.result ?? null}
        isProcessing={batchProgress?.isProcessing ?? false}
      />

      {/* ================================================================ */}
      {/* PHASE 4B - BULK SEO EDIT MODAL                                  */}
      {/* ================================================================ */}

      <BulkSEOEditModalWithReset
        isOpen={bulkSEOOpen}
        onClose={() => setBulkSEOOpen(false)}
        files={bulkSEOFiles}
        onSave={handleBulkSEOSave}
        isSaving={batchProgress?.isProcessing ?? false}
      />

      {/* ================================================================ */}
      {/* PHASE 4B - ADMIN PASSWORD GATE (batch delete)                   */}
      {/* ================================================================ */}

      <AdminPasswordModal
        isOpen={passwordGateOpen}
        onClose={() => {
          setPasswordGateOpen(false);
          setPendingBatchDelete(null);
        }}
        onVerified={() => void handleBatchDeleteConfirmed()}
        operationDescription={`delete ${pendingBatchDelete?.length ?? 0} media ${
          (pendingBatchDelete?.length ?? 0) === 1 ? 'file' : 'files'
        }`}
        inputIdSuffix="batch-delete-password"
      />

      {/* ================================================================ */}
      {/* PHASE 5 - IMAGE CROPPER MODAL                                   */}
      {/* ================================================================ */}

      {cropperImageUrl && (
        <Suspense fallback={null}>
          <EnhancedImageCropperModal
            isOpen={!!cropperImageUrl}
            onClose={() => {
              setCropperImageUrl(null);
              setCropperFileEntry(null);
            }}
            onApply={(croppedDataUrl) => void handleCropApply(croppedDataUrl)}
            imageUrl={cropperImageUrl}
          />
        </Suspense>
      )}

      {/* ================================================================ */}
      {/* PHASE 5 - COPY TOAST                                            */}
      {/* ================================================================ */}

      {copyToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          {copyToast}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED PAGE COMPONENT (with ErrorBoundary)
// ============================================================================

/**
 * AdminMediaManagerPage - Enterprise tier admin media browser page
 *
 * Wraps AdminMediaManagerPageContent in ErrorBoundary for ENTERPRISE tier compliance.
 */
export function AdminMediaManagerPage() {
  return (
    <ErrorBoundary
      componentName="AdminMediaManager"
      fallback={<MediaManagerErrorFallback />}
    >
      <AdminMediaManagerPageContent />
    </ErrorBoundary>
  );
}

export default AdminMediaManagerPage;
