/**
 * RecommendationInboxPagination - Pagination controls for inbox
 *
 * Previous/Next navigation with page info display.
 *
 * @tier SIMPLE
 * @phase Phase 3 - Inbox & Discovery
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendationInboxPagination } from '@features/sharing/components';
 *
 * function InboxList() {
 *   const [page, setPage] = useState(1);
 *
 *   return (
 *     <RecommendationInboxPagination
 *       currentPage={page}
 *       totalPages={5}
 *       total={50}
 *       pageSize={10}
 *       onPageChange={setPage}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RecommendationInboxPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function RecommendationInboxPagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange
}: RecommendationInboxPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        Showing {startItem} to {endItem} of {total} recommendations
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm text-gray-600 px-3">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default RecommendationInboxPagination;
