/**
 * ContentPageClient - Client Component for Content Page
 *
 * Handles client-side interactivity including data fetching, state management,
 * and URL query parameter synchronization. Renders mixed content cards in a
 * Pinterest-style masonry grid (5 columns responsive).
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (complex state, API integration, URL sync, masonry grid)
 * @generated DNA v11.4.0
 * @phase Phase 5 - Page Implementation
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * FEATURES (Phase 5):
 * - State management for content items, loading, errors, pagination
 * - Data fetching from /api/content/search
 * - URL query parameter synchronization
 * - Pinterest-style masonry grid (5 columns)
 * - Loading skeletons and error states
 * - Mixed content type rendering (articles, videos, podcasts)
 * - Integration with Phase 4 components (FilterBar, CampaignSection)
 *
 * KEY DIFFERENCES FROM LISTINGS PAGE:
 * - NO map component (Content page is grid only)
 * - NO displayMode toggle (grid only, no list view)
 * - 5-column masonry layout (vs 4-column responsive grid)
 * - Mixed card types requiring type-based rendering
 *
 * @see docs/pages/layouts/content/phases/PHASE_5_PAGE_IMPLEMENTATION.md
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock, WifiOff, FileText, Sparkles, Users } from 'lucide-react';

// Phase 4 components
import { ContentFilterBar } from '@/features/content/components/ContentFilterBar';
import { ContentCampaignSection } from '@/features/content/components/ContentCampaignSection';
import { ArticleCard } from '@/features/content/components/ArticleCard';
import { VideoCard } from '@/features/content/components/VideoCard';
import { PodcastCard } from '@/features/content/components/PodcastCard';
import { NewsletterCard } from '@/features/content/components/NewsletterCard';
import { GuideCard } from '@/features/content/components/GuideCard';

// New sections
import { LatestContentRow } from '@/features/content/components/LatestContentRow';
import { NewestCreatorsRow } from '@/features/content/components/NewestCreatorsRow';

// Shared components
import Pagination from '@/components/listings/Pagination';

// Types
import type {
  ContentArticle,
  ContentVideo,
  ContentPodcast,
} from '@core/services/ContentService';
import type { Newsletter } from '@core/types/newsletter';
import type { Guide } from '@core/types/guide';

/**
 * Content Item with type discriminator
 * Extends base types with 'type' field for rendering logic
 */
type ContentItemWithType =
  | (ContentArticle & { type: 'article' })
  | (ContentVideo & { type: 'video' })
  | (ContentPodcast & { type: 'podcast' })
  | (Newsletter & { type: 'newsletter' })
  | (Guide & { type: 'guide' });

/**
 * Pagination state from API response
 */
interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * API response envelope format (canonical apiHandler format)
 * @see src/core/api/apiHandler.ts - createSuccessResponse
 */
interface ContentSearchResponse {
  success: boolean;
  data?: {
    items: ContentItemWithType[];
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * Loading skeleton for content masonry grid
 * Displays placeholder cards while data is loading
 */
function ContentSkeleton() {
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

/**
 * Enhanced error display with retry functionality and error code awareness
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5 - Page Implementation
 */
interface ContentErrorProps {
  message: string;
  errorCode?: string | null;
  onRetry: () => void;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

function ContentError({
  message,
  errorCode,
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
}: ContentErrorProps) {
  const isRateLimited = errorCode === 'RATE_LIMITED';
  const isNetworkError = errorCode === 'NETWORK';
  const canRetry = retryCount < maxRetries && !isRateLimited;

  return (
    <div className={`border rounded-lg p-6 text-center ${
      isRateLimited ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
    }`}>
      {/* Icon */}
      <div className="mb-4">
        {isRateLimited ? (
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        ) : isNetworkError ? (
          <WifiOff className="w-12 h-12 text-red-500 mx-auto" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
      </div>

      {/* Title */}
      <h3 className={`text-lg font-semibold mb-2 ${
        isRateLimited ? 'text-amber-800' : 'text-red-800'
      }`}>
        {isRateLimited ? 'Too Many Requests' :
         isNetworkError ? 'Connection Error' :
         'Unable to Load Content'}
      </h3>

      {/* Message */}
      <p className={`mb-4 ${isRateLimited ? 'text-amber-700' : 'text-red-700'}`}>
        {isRateLimited
          ? 'Please wait a moment before trying again.'
          : message}
      </p>

      {/* Retry info */}
      {retryCount > 0 && canRetry && (
        <p className="text-sm text-gray-500 mb-4">
          Attempt {retryCount} of {maxRetries}
        </p>
      )}

      {/* Retry button */}
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

      {/* Rate limit message */}
      {isRateLimited && (
        <p className="mt-4 text-sm text-amber-600">
          Automatic retry in 60 seconds
        </p>
      )}
    </div>
  );
}

/**
 * Empty state when no content is found
 */
function ContentEmpty() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        No Content Found
      </h3>
      <p className="text-gray-600">
        Try adjusting your search or filters to discover articles, videos, and podcasts.
      </p>
    </div>
  );
}

/**
 * Render content card based on type discriminator
 */
function renderContentCard(item: ContentItemWithType): React.ReactNode {
  switch (item.type) {
    case 'article':
      return <ArticleCard article={item} />;
    case 'video':
      return <VideoCard video={item} />;
    case 'podcast':
      return <PodcastCard podcast={item} />;
    case 'newsletter':
      return <NewsletterCard newsletter={item} />;
    case 'guide':
      return <GuideCard guide={item} />;
    default:
      return null;
  }
}

/**
 * ContentPageClient - Main client component for content page
 */
export function ContentPageClient() {
  const searchParams = useSearchParams();

  // State management
  const [content, setContent] = useState<ContentItemWithType[]>([]);
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

  // Extract query parameters
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = searchParams.get('sort') || 'category_featured';
  const currentQuery = searchParams.get('q') || '';
  const currentType = searchParams.get('type') || 'all';

  /**
   * Fetch content from API
   * Uses canonical apiHandler response format: { success, data, error, meta }
   */
  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string from current params
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', '20');
      params.set('sort', currentSort);
      params.set('type', currentType);
      if (currentQuery) {
        params.set('q', currentQuery);
      }

      const response = await fetch(`/api/content/search?${params.toString()}`, {
        credentials: 'include',
      });

      // Detect error codes from HTTP status
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

      const result: ContentSearchResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to load content');
      }

      setContent(result.data.items);
      setPagination({
        page: result.data.page,
        pageSize: result.data.pageSize,
        total: result.data.total,
        hasNext: result.data.hasNext,
        hasPrev: result.data.hasPrev,
      });
    } catch (err) {
      let code = 'INTERNAL';
      let message = 'An unexpected error occurred';

      if (err instanceof Error) {
        message = err.message;

        // Detect rate limiting from response
        if (message.includes('rate') || message.includes('429')) {
          code = 'RATE_LIMITED';
        }
        // Detect network errors
        else if (err.name === 'TypeError' && message.includes('fetch')) {
          code = 'NETWORK';
          message = 'Unable to connect. Please check your internet connection.';
        }
      }

      setError(message);
      setErrorCode(code);
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, currentQuery, currentType]);

  // Fetch content when URL params change
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  /**
   * Handle retry with exponential backoff
   */
  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRIES) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);

    setTimeout(() => {
      setIsRetrying(false);
      fetchContent();
    }, delay);
  }, [retryCount, fetchContent]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Content
        </h1>
        <p className="text-gray-600">
          Discover articles, videos, and podcasts from local businesses and experts.
        </p>
      </div>

      {/* Filter Bar — single row with all controls */}
      <ContentFilterBar className="mb-6" />

      {/* Latest Content — 2 cards, each a different content type */}
      <LatestContentRow className="mb-8" />

      {/* Newest Creators — 3 cards for newest creators with established profiles */}
      <NewestCreatorsRow className="mb-10" />

      {/* Featured Content Scrollers: Podcasts, Articles, Videos */}
      <ContentCampaignSection className="mb-12" />

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {content.length} of {pagination.total} items
          {currentQuery && (
            <span className="ml-1">
              for &quot;<span className="font-medium">{currentQuery}</span>&quot;
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && <ContentSkeleton />}

      {/* Error State */}
      {error && !isLoading && (
        <ContentError
          message={error}
          errorCode={errorCode}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          retryCount={retryCount}
          maxRetries={MAX_RETRIES}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && content.length === 0 && <ContentEmpty />}

      {/* Masonry Grid (5-column Pinterest-style) */}
      {!isLoading && !error && content.length > 0 && (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
          {content.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="mb-4 break-inside-avoid"
            >
              {renderContentCard(item)}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && !error && content.length > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          className="mt-8"
        />
      )}
    </div>
  );
}

export default ContentPageClient;
