'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  className?: string;
  basePath?: string;
}

export default function Pagination({
  page,
  pageSize,
  total,
  hasNext,
  hasPrev,
  className,
  basePath = '/listings'
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());

    router.push(`${basePath}?${params.toString()}` as never);

    // Scroll to top after navigation (SSR-safe)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (hasPrev && page > 1) {
      handlePageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (hasNext && page < maxPage) {
      handlePageChange(page + 1);
    }
  };

  // Don't render if there's only one page or no results
  if (maxPage <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between mt-6 ${className || ''}`}>
      <button
        onClick={handlePrevious}
        disabled={!hasPrev}
        aria-label="Go to previous page"
        className={`
          px-4 py-2 text-sm font-medium rounded-md border transition-colors
          ${!hasPrev 
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }
        `}
      >
        ← Previous
      </button>

      <span className="text-sm text-gray-600">
        Page {page} of {maxPage}
      </span>

      <button
        onClick={handleNext}
        disabled={!hasNext}
        aria-label="Go to next page"
        className={`
          px-4 py-2 text-sm font-medium rounded-md border transition-colors
          ${!hasNext 
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          }
        `}
      >
        Next →
      </button>
    </div>
  );
}