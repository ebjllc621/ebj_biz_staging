/**
 * Admin Media Module - Barrel Export
 *
 * Exports all public components, hooks, and types for the admin media manager.
 *
 * @module src/features/media/admin
 * @phase Phase 4A - Admin Media Manager Core
 */

// Hook
export { useMediaDirectory } from './hooks/useMediaDirectory';
export type { UseMediaDirectoryReturn } from './hooks/useMediaDirectory';

// Components
export { AdminMediaManagerPage } from './components/AdminMediaManagerPage';
export { DirectoryBreadcrumb } from './components/DirectoryBreadcrumb';
export type { DirectoryBreadcrumbProps, BreadcrumbItem } from './components/DirectoryBreadcrumb';
export { DirectoryTree } from './components/DirectoryTree';
export type { DirectoryTreeProps } from './components/DirectoryTree';
export { FileGrid } from './components/FileGrid';
export type { FileGridProps } from './components/FileGrid';
export { FileList } from './components/FileList';
export type { FileListProps } from './components/FileList';
export { MediaManagerToolbar } from './components/MediaManagerToolbar';
export type { MediaManagerToolbarProps } from './components/MediaManagerToolbar';
export { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
export type { ConfirmDeleteModalProps } from './components/ConfirmDeleteModal';
export { CreateFolderModal } from './components/CreateFolderModal';
export type { CreateFolderModalProps } from './components/CreateFolderModal';
export { RenameFolderModal } from './components/RenameFolderModal';
export type { RenameFolderModalProps } from './components/RenameFolderModal';

// Phase 4B - Batch Operations + SEO + Context Menus
export { FileContextMenu } from './components/FileContextMenu';
export type { FileContextMenuProps } from './components/FileContextMenu';
export { FolderContextMenu } from './components/FolderContextMenu';
export type { FolderContextMenuProps } from './components/FolderContextMenu';
export { BatchOperationsToolbar } from './components/BatchOperationsToolbar';
export type { BatchOperationsToolbarProps } from './components/BatchOperationsToolbar';
export { MoveItemModal } from './components/MoveItemModal';
export type { MoveItemModalProps } from './components/MoveItemModal';
export { BatchProgressModal } from './components/BatchProgressModal';
export type { BatchProgressModalProps } from './components/BatchProgressModal';
export { SEOHealthBadge } from './components/SEOHealthBadge';
export type { SEOHealthBadgeProps } from './components/SEOHealthBadge';
export { BulkSEOEditModal } from './components/BulkSEOEditModal';
export type { BulkSEOEditModalProps, SEOUpdateEntry } from './components/BulkSEOEditModal';
