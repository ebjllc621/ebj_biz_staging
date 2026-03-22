/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1A - Article Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for article detail page. Receives initial data from server
 * component for optimal LCP. Composes ArticleDetailHero, ArticleDetailContent,
 * ArticleAuthorBio, ArticleDetailSidebar, and ArticleActionBar.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBreadcrumb } from '@features/content/components/shared/ContentBreadcrumb';
import { ArticleDetailHero } from '@features/content/components/articles/ArticleDetailHero';
import { ArticleDetailContent } from '@features/content/components/articles/ArticleDetailContent';
import { ArticleDetailSidebar } from '@features/content/components/articles/ArticleDetailSidebar';
import { ArticleAuthorBio } from '@features/content/components/articles/ArticleAuthorBio';
import { ArticleActionBar } from '@features/content/components/articles/ArticleActionBar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useContentBookmark } from '@features/content/components/shared/useContentBookmark';
import { ContentReportModal } from '@features/content/components/shared/ContentReportModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ContentCommentSection } from '@features/content/components/shared/ContentCommentSection';
import { ContentRatingWidget } from '@/components/reviews/ContentRatingWidget';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useContentAnalytics } from '@features/content/hooks/useContentAnalytics';
import type { ContentArticle } from '@core/services/ContentService';
import type { Listing } from '@core/services/ListingService';

interface ArticleDetailClientProps {
  slug: string;
  initialArticle: ContentArticle | null;
  initialListing: Listing | null;
}

/**
 * ArticleDetailClientInternal — handles state, layout, and sub-component composition
 */
function ArticleDetailClientInternal({
  slug,
  initialArticle,
  initialListing
}: ArticleDetailClientProps) {
  const router = useRouter();

  const [article, setArticle] = useState<ContentArticle | null>(initialArticle);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialArticle);
  const [error, setError] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useContentBookmark('article', article?.id ?? 0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const { trackContentEvent } = useContentAnalytics('article', article?.id);

  // Track page view on mount
  useEffect(() => {
    if (article?.id) {
      trackContentEvent('page_view');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id]);

  // Fetch reviews for this article
  useEffect(() => {
    async function fetchReviews() {
      if (!article?.id) return;
      try {
        const res = await fetch(`/api/content/articles/${article.id}/ratings?reviews=true&page=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data?.reviews || []);
        }
      } catch {}
    }
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article?.id, reviewRefreshKey]);

  // Client-side fallback fetch — only runs if server did not provide initial data
  useEffect(() => {
    if (!initialArticle && slug) {
      fetchArticle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialArticle]);

  const fetchArticle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/content/articles/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Article not found');
        }
        throw new Error('Failed to fetch article');
      }

      const data = await response.json();
      const articleData: ContentArticle = data.data?.article;
      setArticle(articleData);

      // Fetch listing if article has listing_id
      if (articleData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${articleData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendSuccess = useCallback(() => {
    // Future: show toast notification (Phase 3)
  }, []);

  const handleShareClick = useCallback(() => {
    setIsShareOpen(true);
  }, []);

  const handleShareComplete = useCallback((platform: string) => {
    trackContentEvent('share', undefined, platform);
  }, [trackContentEvent]);

  const handleBookmarkClick = useCallback(() => {
    toggleBookmark();
  }, [toggleBookmark]);

  const handleReportClick = useCallback(() => {
    setIsReportOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Back Button Skeleton */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
                <div className="h-32 bg-gray-200 rounded-xl" />
              </div>
              {/* Sidebar */}
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded-xl" />
                <div className="h-32 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 text-lg font-medium">{error || 'Article not found'}</p>
          <a
            href="/content"
            className="mt-4 inline-block text-biz-orange hover:text-orange-600 font-medium"
          >
            Back to Content
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <ContentBreadcrumb
        contentType="article"
        title={article.title}
      />

      {/* Main Content Area — 2-column layout */}
      <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <ArticleDetailHero
              article={article}
              listingName={listing?.name}
              listingLogo={listing?.logo_url ?? undefined}
              onShareClick={handleShareClick}
              onBookmarkClick={handleBookmarkClick}
              onReportClick={handleReportClick}
              isBookmarked={isBookmarked}
              onRecommendSuccess={handleRecommendSuccess}
            />

            <ArticleDetailContent article={article} />

            <ArticleAuthorBio listing={listing} />

            <ContentRatingWidget contentType="article" contentId={article.id} className="mt-8" />

            {/* Reviews Section */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
                <button
                  onClick={() => setShowWriteReview(true)}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Write a Review
                </button>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <ReviewCard
                      key={review.id}
                      review={{
                        id: review.id,
                        user_id: review.user_id,
                        rating: review.rating || 0,
                        title: review.title || null,
                        review_text: review.comment || null,
                        images: review.images || null,
                        helpful_count: review.helpful_count || 0,
                        not_helpful_count: review.not_helpful_count || 0,
                        owner_response: null,
                        owner_response_date: null,
                        is_verified_purchase: false,
                        created_at: review.created_at,
                        reviewer_name: review.reviewer_name,
                        reviewer_avatar_url: review.reviewer_avatar_url,
                      }}
                      entityOwnerId={0}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No reviews yet. Be the first to share your thoughts!</p>
              )}
            </div>

            <ContentCommentSection
              contentType="article"
              contentId={article.id}
              contentTitle={article.title}
            />
          </div>

          {/* Sidebar */}
          <div className="order-last lg:order-none">
            <ArticleDetailSidebar article={article} listing={listing} />
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <ArticleActionBar
        article={article}
        onShareClick={handleShareClick}
        onBookmarkClick={handleBookmarkClick}
        onReportClick={handleReportClick}
        isBookmarked={isBookmarked}
        onRecommendSuccess={handleRecommendSuccess}
      />

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        entityType="article"
        entityId={article.id}
        entityName={article.title}
        onSuccess={() => {
          setShowWriteReview(false);
          setReviewRefreshKey(prev => prev + 1);
        }}
      />

      {/* Report Modal */}
      <ContentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        contentType="article"
        contentId={article.id}
        contentTitle={article.title}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="article"
        contentTitle={article.title}
        contentSlug={article.slug}
        contentImage={article.featured_image ?? null}
        contentExcerpt={article.excerpt ?? null}
        listingName={listing?.name ?? null}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
}

/**
 * ArticleDetailClient with ErrorBoundary wrapper
 * @tier STANDARD — Requires ErrorBoundary per Build Map v2.1
 */
export function ArticleDetailClient(props: ArticleDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="ArticleDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this article. Please try again.
            </p>
            <a
              href="/content"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Back to Content
            </a>
          </div>
        </div>
      }
    >
      <ArticleDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
