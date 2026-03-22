/**
 * ContactsPagination - Pagination controls for contacts list
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Contacts Phase E (UI Enhancement)
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Provides:
 * - Page size selector (20, 50, 100, All)
 * - Previous/Next navigation
 * - Current page indicator
 * - Total count display
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/CONTACTS_PAGINATION.md
 */
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PageSize = 20 | 50 | 100 | 'all';

interface ContactsPaginationProps {
  /** Total number of contacts */
  totalCount: number;
  /** Current page (1-indexed) */
  currentPage: number;
  /** Items per page */
  pageSize: PageSize;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (size: PageSize) => void;
  /** Position: top shows compact, bottom shows full */
  position?: 'top' | 'bottom';
}

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 'all', label: 'All' }
];

/**
 * ContactsPagination component
 */
export function ContactsPagination({
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  position = 'bottom'
}: ContactsPaginationProps) {
  // Calculate pagination values
  const effectivePageSize = pageSize === 'all' ? totalCount : pageSize;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalCount / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize + 1;
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

  // Top position: compact display for search bar area
  if (position === 'top') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="hidden sm:inline">Show</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(e.target.value === 'all' ? 'all' : Number(e.target.value) as PageSize)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
        >
          {PAGE_SIZE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap">
          {pageSize === 'all' ? (
            <><span className="font-semibold text-biz-navy">{totalCount}</span> contacts</>
          ) : (
            <>
              <span className="font-semibold text-biz-navy">{startIndex}-{endIndex}</span>
              <span className="hidden sm:inline"> of <span className="font-semibold text-biz-navy">{totalCount}</span></span>
            </>
          )}
        </span>
      </div>
    );
  }

  // Bottom position: full navigation controls
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
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
          <>Showing all <span className="font-semibold text-biz-navy">{totalCount}</span> contacts</>
        ) : (
          <>
            Showing <span className="font-semibold text-biz-navy">{startIndex}</span>
            {' '}-{' '}
            <span className="font-semibold text-biz-navy">{endIndex}</span>
            {' '}of{' '}
            <span className="font-semibold text-biz-navy">{totalCount}</span> contacts
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

export default ContactsPagination;
