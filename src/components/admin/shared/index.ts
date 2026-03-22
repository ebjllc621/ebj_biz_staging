/**
 * Admin Shared Components
 *
 * Reusable components for admin table pages.
 * All components follow the canonical standard defined in:
 * @see docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 */

// Core page structure components
export { AdminPageHeader } from './AdminPageHeader';
export type { AdminPageHeaderProps } from './AdminPageHeader';

export { AdminStatsPanel } from './AdminStatsPanel';
export type { AdminStatsPanelProps, StatItem, StatSection } from './AdminStatsPanel';

export { AdminPaginationControls } from './AdminPaginationControls';
export type { AdminPaginationControlsProps } from './AdminPaginationControls';

// Search and filter components
export { AdminSearchBar } from './AdminSearchBar';
export type {
  AdminSearchBarProps,
  SearchMode,
  SearchHistoryItem
} from './AdminSearchBar';

export {
  AdminAdvancedFilterPanel,
  commonFilterFields
} from './AdminAdvancedFilterPanel';
export type {
  AdminAdvancedFilterPanelProps,
  FilterField,
  MatchMode
} from './AdminAdvancedFilterPanel';

// Batch operations
export {
  AdminBatchHandlingBar,
  createStandardBatchActions
} from './AdminBatchHandlingBar';
export type {
  AdminBatchHandlingBarProps,
  BatchAction
} from './AdminBatchHandlingBar';

// Modals
export { AdminPasswordModal } from './AdminPasswordModal';
export type { AdminPasswordModalProps } from './AdminPasswordModal';

export { AdminImportExportModal } from './AdminImportExportModal';
export type { AdminImportExportModalProps } from './AdminImportExportModal';

// Status indicators
export { StatusIconBadge } from './StatusIconBadge';
export type {
  StatusIconBadgeProps,
  StatusIconBadgeVariant,
  StatusIconBadgeSize
} from './StatusIconBadge';
