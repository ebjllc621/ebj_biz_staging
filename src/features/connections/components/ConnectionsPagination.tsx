/**
 * ConnectionsPagination - Pagination controls for connections list
 *
 * @component Client Component
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Provides:
 * - Page size selector (20, 50, 100, All)
 * - Previous/Next navigation
 * - Current page indicator
 * - Total count display
 *
 * @reference src/features/contacts/components/ContactsPagination.tsx
 */
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PageSize = 20 | 50 | 100 | 'all';

interface ConnectionsPaginationProps {
  /** Total number of items */
  totalCount: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Items per page */
  pageSize: PageSize;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: PageSize) => void;
  /** Label for items (e.g., "connections", "requests") */
  itemLabel?: string;
}

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'All' }
];

/**
 * ConnectionsPagination component
 */
export function ConnectionsPagination({
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items'
}: ConnectionsPaginationProps) {
  // Calculate pagination values
  const effectivePageSize = pageSize === 'all' ? totalCount : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalCount / effectivePageSize);
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endIndex = Math.min(currentPage * effectivePageSize, totalCount);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (newSize: PageSize) => {
    onPageSizeChange(newSize);
    // Reset to page 1 when changing page size
    onPageChange(1);
  };

  // Don't show pagination if no items
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 bg-white rounded-xl border border-gray-200">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value) as PageSize)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
        >
          {PAGE_SIZE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span>per page</span>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600">
        {pageSize === 'all' ? (
          <>Showing all <span className="font-semibold text-biz-navy">{totalCount}</span> {itemLabel}</>
        ) : (
          <>
            Showing <span className="font-semibold text-biz-navy">{startIndex}</span>
            {' '}-{' '}
            <span className="font-semibold text-biz-navy">{endIndex}</span>
            {' '}of{' '}
            <span className="font-semibold text-biz-navy">{totalCount}</span> {itemLabel}
          </>
        )}
      </div>

      {/* Navigation Controls */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              canGoPrevious
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Indicator */}
          <span className="text-sm text-gray-600 px-2">
            Page <span className="font-semibold text-biz-navy">{currentPage}</span> of{' '}
            <span className="font-semibold text-biz-navy">{totalPages}</span>
          </span>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              canGoNext
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                : 'border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ConnectionsPagination;
