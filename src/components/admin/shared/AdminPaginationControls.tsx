/**
 * AdminPaginationControls - Pagination header for admin table pages
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * Features:
 * - Page size selector (20/50/100/All)
 * - Results range indicator
 * - Page navigation (prev/next)
 * - Refresh button with loading state
 * - Responsive layout
 */

'use client';

import { ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';

export interface AdminPaginationControlsProps {
  /** Title to display in the header (e.g., "Listings", "Jobs") */
  title: string;
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Whether data is loading */
  loading?: boolean;
  /** Page size options (default: [20, 50, 100, 'all']) */
  pageSizeOptions?: (number | 'all')[];
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when page size changes */
  onPageSizeChange: (size: number) => void;
  /** Called when refresh is clicked */
  onRefresh: () => void;
}

export function AdminPaginationControls({
  title,
  page,
  pageSize,
  total,
  loading = false,
  pageSizeOptions = [20, 50, 100, 'all'],
  onPageChange,
  onPageSizeChange,
  onRefresh
}: AdminPaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const handlePageSizeChange = (value: string) => {
    if (value === 'all') {
      onPageSizeChange(total || 1000);
    } else {
      onPageSizeChange(parseInt(value));
    }
  };

  // Check if current pageSize equals total (showing all)
  const isShowingAll = pageSize >= total && total > 0;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 hidden sm:inline">Show</span>
          <select
            value={isShowingAll ? 'all' : pageSize}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            disabled={loading}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            aria-label="Page size"
          >
            {pageSizeOptions.map((option) => (
              <option key={String(option)} value={String(option)}>
                {option === 'all' ? 'All' : option}
              </option>
            ))}
          </select>
        </div>

        {/* Results range indicator */}
        <span className="text-sm text-gray-600 hidden md:inline">
          Showing {startItem} to {endItem} of {total} results
        </span>

        {/* Page navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="p-1.5 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

export default AdminPaginationControls;
