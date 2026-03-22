/**
 * NewslettersListClient - Client Component for Newsletters List Page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase N4
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, WifiOff, Mail } from 'lucide-react';

import { ContentFilterBar } from '@/features/content/components/ContentFilterBar';
import { NewsletterCard } from '@/features/content/components/NewsletterCard';
import Pagination from '@/components/listings/Pagination';
import type { Newsletter } from '@core/types/newsletter';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface NewslettersResponse {
  success: boolean;
  data?: {
    newsletters: Newsletter[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

function NewslettersSkeleton() {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="mb-4 break-inside-avoid animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
        >
          <div className="h-40 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface NewslettersErrorProps {
  message: string;
  errorCode?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

function NewslettersError({
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}: NewslettersErrorProps) {
  const isRateLimited = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK';
  const canRetry = retryCount < maxRetries && !isRateLimited;

  return (
    <div className={`border rounded-lg p-6 text-center ${
      isRateLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="mb-4">
        {isRateLimited ? (
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        ) : isNetworkError ? (
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${
        isRateLimited ? 'text-amber-800' : 'text-red-800'
      }`}>
        {isRateLimited ? 'Too Many Requests' :
         isNetworkError ? 'Connection Error' :
         'Unable to Load Newsletters'}
      </h3>
      <p className={`mb-4 ${isRateLimited ? 'text-amber-700' : 'text-red-700'}`}>
        {isRateLimited
          ? 'Please wait a moment before trying again.'
          : message}
      </p>
      {retryCount > 0 && canRetry && (
        <p className="text-sm text-gray-500 mb-4">
          Attempt {retryCount} of {maxRetries}
        </p>
      )}
      {canRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`px-4 py-2 rounded-md transition-colors ${
            isRetrying
              ? 'bg-gray-400 cursor-not-allowed'
              : isRateLimited
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
      {isRateLimited && (
        <p className="mt-4 text-sm text-amber-600">
          Automatic retry in 60 seconds
        </p>
      )}
    </div>
  );
}

function NewslettersEmpty() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No Newsletters Found
      </h3>
      <p className="text-gray-600">
        Try adjusting your search or filters to discover newsletters.
      </p>
    </div>
  );
}

export function NewslettersListClient() {
  const searchParams = useSearchParams();

  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  });

  const MAX_RETRIES = 3;

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  // Map 'category_featured' to 'recent' since newsletter API doesn't support it
  const rawSort = searchParams.get('sort') || 'recent';
  const currentSort = rawSort === 'category_featured' ? 'recent' : rawSort;
  const currentQuery = searchParams.get('q') || '';
  const currentFollowing = searchParams.get('following') === 'true';

  const fetchNewsletters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', '20');
      params.set('sort', currentSort);
      if (currentQuery) {
        params.set('q', currentQuery);
      }
      if (currentFollowing) {
        params.set('following', 'true');
      }

      const response = await fetch(`/api/content/newsletters?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw Object.assign(new Error('Rate limited'), { code: 'RATE_LIMITED' });
        }
        if (response.status === 408 || response.status === 504) {
          throw Object.assign(new Error('Request timeout'), { code: 'TIMEOUT' });
        }
        if (response.status >= 500) {
          throw Object.assign(new Error('Server error'), { code: 'INTERNAL' });
        }
      }

      const result: NewslettersResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to load newsletters');
      }

      setNewsletters(result.data.newsletters);
      setPagination({
        page: result.data.pagination.page,
        pageSize: result.data.pagination.pageSize,
        total: result.data.pagination.total,
        hasNext: result.data.pagination.hasNext,
        hasPrev: result.data.pagination.hasPrev,
      });
    } catch (err) {
      let code = 'INTERNAL';
      let message = 'An unexpected error occurred';

      if (err instanceof Error) {
        message = err.message;
        if (message.includes('rate') || message.includes('429')) {
          code = 'RATE_LIMITED';
        } else if (err.name === 'TypeError' && message.includes('fetch')) {
          code = 'NETWORK';
          message = 'Unable to connect. Please check your internet connection.';
        }
      }

      setError(message);
      setErrorCode(code);
      setNewsletters([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, currentQuery, currentFollowing]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    setTimeout(() => {
      setIsRetrying(false);
      fetchNewsletters();
    }, delay);
  }, [retryCount, fetchNewsletters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Newsletters
        </h1>
        <p className="text-gray-600">
          Browse newsletters from local businesses and experts. Stay informed with curated updates and industry insights.
        </p>
      </div>

      <ContentFilterBar className="mb-6" hideTypeFilter={true} />

      {!isLoading && !error && (
        <div className="mb-6 bg-gradient-to-r from-biz-navy to-blue-800 rounded-xl p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Stay Updated</h2>
            <p className="text-sm text-blue-200">
              Subscribe to newsletters from your favorite businesses directly from their newsletter pages.
            </p>
          </div>
          <Mail className="w-10 h-10 text-blue-300 flex-shrink-0 ml-4 hidden sm:block" />
        </div>
      )}

      {!isLoading && !error && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {newsletters.length} of {pagination.total} newsletters
          {currentQuery && (
            <span className="ml-1">
              for &quot;<span className="font-medium">{currentQuery}</span>&quot;
            </span>
          )}
        </div>
      )}

      {isLoading && <NewslettersSkeleton />}

      {error && !isLoading && (
        <NewslettersError
          message={error}
          errorCode={errorCode}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={MAX_RETRIES}
        />
      )}

      {!isLoading && !error && newsletters.length === 0 && <NewslettersEmpty />}

      {!isLoading && !error && newsletters.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {newsletters.map((newsletter) => (
            <div
              key={`newsletter-${newsletter.id}`}
              className="mb-4 break-inside-avoid"
            >
              <NewsletterCard newsletter={newsletter} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && newsletters.length > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          basePath="/content/newsletters"
          className="mt-8"
        />
      )}
    </div>
  );
}

export default NewslettersListClient;
