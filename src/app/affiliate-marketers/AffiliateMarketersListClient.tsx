/**
 * AffiliateMarketersListClient - Client Component for Affiliate Marketers List Page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/content/articles/ArticlesListClient.tsx - Canonical list client pattern
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, WifiOff, Users } from 'lucide-react';

import { AffiliateMarketerFilterBar } from '@features/content/components/affiliate-marketers/AffiliateMarketerFilterBar';
import { AffiliateMarketerCard } from '@features/content/components/affiliate-marketers/AffiliateMarketerCard';
import Pagination from '@/components/listings/Pagination';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AffiliateMarketersResponse {
  success: boolean;
  data?: {
    marketers: AffiliateMarketerProfile[];
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

function AffiliateMarketersSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
        >
          {/* Cover area */}
          <div className="h-32 bg-gray-200" />
          <div className="px-4 pt-10 pb-4">
            {/* Avatar placeholder */}
            <div className="absolute -mt-16 w-16 h-16 rounded-full bg-gray-300 border-2 border-white" />
            {/* Name line */}
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            {/* Headline lines */}
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            {/* Badge row */}
            <div className="flex gap-1 mt-3">
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
              <div className="h-5 w-14 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface AffiliateMarketersErrorProps {
  message: string;
  errorCode?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

function AffiliateMarketersError({
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}: AffiliateMarketersErrorProps) {
  const isRateLimited = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK';
  const canRetry = retryCount < maxRetries && !isRateLimited;

  return (
    <div
      className={`border rounded-lg p-6 text-center ${
        isRateLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="mb-4">
        {isRateLimited ? (
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        ) : isNetworkError ? (
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
      </div>
      <h3
        className={`text-lg font-semibold mb-2 ${
          isRateLimited ? 'text-amber-800' : 'text-red-800'
        }`}
      >
        {isRateLimited
          ? 'Too Many Requests'
          : isNetworkError
          ? 'Connection Error'
          : 'Unable to Load Affiliate Marketers'}
      </h3>
      <p className={`mb-4 ${isRateLimited ? 'text-amber-700' : 'text-red-700'}`}>
        {isRateLimited ? 'Please wait a moment before trying again.' : message}
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
        <p className="mt-4 text-sm text-amber-600">Automatic retry in 60 seconds</p>
      )}
    </div>
  );
}

function AffiliateMarketersEmpty() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No Affiliate Marketers Found
      </h3>
      <p className="text-gray-600">
        Try adjusting your search or filters to find affiliate marketers.
      </p>
    </div>
  );
}

export function AffiliateMarketersListClient() {
  const searchParams = useSearchParams();

  const [marketers, setMarketers] = useState<AffiliateMarketerProfile[]>([]);
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
  const currentSort = searchParams.get('sort') || 'recent';
  const currentQuery = searchParams.get('q') || '';
  const currentNiche = searchParams.get('niche') || '';
  const currentPlatform = searchParams.get('platform') || '';
  const currentLocation = searchParams.get('location') || '';
  const currentVerified = searchParams.get('verified') || '';

  const fetchMarketers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', '20');
      params.set('sort', currentSort);
      if (currentQuery) params.set('q', currentQuery);
      if (currentNiche) params.set('niche', currentNiche);
      if (currentPlatform) params.set('platform', currentPlatform);
      if (currentLocation) params.set('location', currentLocation);
      if (currentVerified) params.set('verified', currentVerified);

      const response = await fetch(`/api/content/affiliate-marketers?${params.toString()}`, {
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

      const result: AffiliateMarketersResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to load affiliate marketers');
      }

      setMarketers(result.data.marketers);
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
      setMarketers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, currentQuery, currentNiche, currentPlatform, currentLocation, currentVerified]);

  useEffect(() => {
    fetchMarketers();
  }, [fetchMarketers]);

  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
    setTimeout(() => {
      setIsRetrying(false);
      fetchMarketers();
    }, delay);
  }, [retryCount, fetchMarketers]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Affiliate Marketers
        </h1>
        <p className="text-gray-600">
          Browse and connect with affiliate marketers across every niche and platform.
        </p>
      </div>

      <AffiliateMarketerFilterBar className="mb-6" />

      {!isLoading && !error && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {marketers.length} of {pagination.total} affiliate marketers
          {currentQuery && (
            <span className="ml-1">
              for &quot;<span className="font-medium">{currentQuery}</span>&quot;
            </span>
          )}
        </div>
      )}

      {isLoading && <AffiliateMarketersSkeleton />}

      {error && !isLoading && (
        <AffiliateMarketersError
          message={error}
          errorCode={errorCode}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={MAX_RETRIES}
        />
      )}

      {!isLoading && !error && marketers.length === 0 && <AffiliateMarketersEmpty />}

      {!isLoading && !error && marketers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {marketers.map((marketer) => (
            <AffiliateMarketerCard key={`marketer-${marketer.id}`} marketer={marketer} />
          ))}
        </div>
      )}

      {!isLoading && !error && marketers.length > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          basePath="/affiliate-marketers"
          className="mt-8"
        />
      )}
    </div>
  );
}

export default AffiliateMarketersListClient;
