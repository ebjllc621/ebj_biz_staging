/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1B - Podcast Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for podcast detail page. Receives initial data from server
 * component for optimal LCP. Composes PodcastDetailHero, PodcastPlayer,
 * PodcastDetailContent, and PodcastDetailSidebar.
 * Mobile action bar is inline within PodcastDetailHero (no separate ActionBar component).
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBreadcrumb } from '@features/content/components/shared/ContentBreadcrumb';
import { PodcastDetailHero } from '@features/content/components/podcasts/PodcastDetailHero';
import { PodcastPlayer } from '@features/content/components/podcasts/PodcastPlayer';
import { PodcastDetailContent } from '@features/content/components/podcasts/PodcastDetailContent';
import { PodcastDetailSidebar } from '@features/content/components/podcasts/PodcastDetailSidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useContentBookmark } from '@features/content/components/shared/useContentBookmark';
import { ContentReportModal } from '@features/content/components/shared/ContentReportModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ContentCommentSection } from '@features/content/components/shared/ContentCommentSection';
import { ContentRatingWidget } from '@/components/reviews/ContentRatingWidget';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useContentAnalytics } from '@features/content/hooks/useContentAnalytics';
import type { ContentPodcast } from '@core/services/ContentService';
import type { Listing } from '@core/services/ListingService';

interface PodcastDetailClientProps {
  slug: string;
  initialPodcast: ContentPodcast | null;
  initialListing: Listing | null;
}

/**
 * PodcastDetailClientInternal — handles state, layout, and sub-component composition
 */
function PodcastDetailClientInternal({
  slug,
  initialPodcast,
  initialListing
}: PodcastDetailClientProps) {
  const router = useRouter();

  const [podcast, setPodcast] = useState<ContentPodcast | null>(initialPodcast);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialPodcast);
  const [error, setError] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useContentBookmark('podcast', podcast?.id ?? 0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const { trackContentEvent } = useContentAnalytics('podcast', podcast?.id);

  // Track page view on mount
  useEffect(() => {
    if (podcast?.id) {
      trackContentEvent('page_view');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcast?.id]);

  // Fetch reviews for this podcast
  useEffect(() => {
    async function fetchReviews() {
      if (!podcast?.id) return;
      try {
        const res = await fetch(`/api/content/podcasts/${podcast.id}/ratings?reviews=true&page=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data?.reviews || []);
        }
      } catch {}
    }
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcast?.id, reviewRefreshKey]);

  // Client-side fallback fetch — only runs if server did not provide initial data
  useEffect(() => {
    if (!initialPodcast && slug) {
      fetchPodcast();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialPodcast]);

  const fetchPodcast = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/content/podcasts/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Podcast not found');
        }
        throw new Error('Failed to fetch podcast');
      }

      const data = await response.json();
      const podcastData: ContentPodcast = data.data?.podcast;
      setPodcast(podcastData);

      // Fetch listing if podcast has listing_id
      if (podcastData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${podcastData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load podcast');
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
                {/* Square artwork placeholder */}
                <div className="aspect-square max-h-64 bg-gray-200 rounded-xl w-full" />
                {/* Audio player bar placeholder */}
                <div className="h-24 bg-gray-200 rounded-xl" />
                <div className="h-48 bg-gray-200 rounded-xl" />
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
  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 text-lg font-medium">{error || 'Podcast not found'}</p>
          <a
            href="/content"
            className="mt-4 inline-block text-teal-600 hover:text-teal-700 font-medium"
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
        contentType="podcast"
        title={podcast.title}
      />

      {/* Main Content Area — 2-column layout */}
      {/* pb-24 on mobile to clear inline mobile action bar rendered inside PodcastDetailHero */}
      <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <PodcastDetailHero
              podcast={podcast}
              listingName={listing?.name}
              listingLogo={listing?.logo_url ?? undefined}
              onShareClick={handleShareClick}
              onBookmarkClick={handleBookmarkClick}
              onReportClick={handleReportClick}
              isBookmarked={isBookmarked}
              onRecommendSuccess={handleRecommendSuccess}
            />

            <PodcastPlayer
              audioUrl={podcast.audio_url}
              title={podcast.title}
            />

            <PodcastDetailContent podcast={podcast} />

            <ContentRatingWidget contentType="podcast" contentId={podcast.id} className="mt-8" />

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
              contentType="podcast"
              contentId={podcast.id}
              contentTitle={podcast.title}
            />
          </div>

          {/* Sidebar */}
          <div className="order-last lg:order-none">
            <PodcastDetailSidebar podcast={podcast} listing={listing} />
          </div>
        </div>
      </div>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        entityType="podcast"
        entityId={podcast.id}
        entityName={podcast.title}
        onSuccess={() => {
          setShowWriteReview(false);
          setReviewRefreshKey(prev => prev + 1);
        }}
      />

      {/* Report Modal */}
      <ContentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        contentType="podcast"
        contentId={podcast.id}
        contentTitle={podcast.title}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="podcast"
        contentTitle={podcast.title}
        contentSlug={podcast.slug}
        contentImage={podcast.thumbnail ?? null}
        contentExcerpt={podcast.description ?? null}
        listingName={listing?.name ?? null}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
}

/**
 * PodcastDetailClient with ErrorBoundary wrapper
 * @tier STANDARD — Requires ErrorBoundary per Build Map v2.1
 */
export function PodcastDetailClient(props: PodcastDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="PodcastDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this podcast. Please try again.
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
      <PodcastDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
