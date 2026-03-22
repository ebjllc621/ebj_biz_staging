/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase G3 - Guide Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for guide detail page. Receives initial data from server
 * component for optimal LCP. Composes GuideDetailHero, GuideDetailContent,
 * GuideDetailSidebar, and GuideActionBar.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContentBreadcrumb } from '@features/content/components/shared/ContentBreadcrumb';
import { GuideDetailHero } from '@features/content/components/guides/GuideDetailHero';
import { GuideDetailContent } from '@features/content/components/guides/GuideDetailContent';
import { GuideDetailSidebar } from '@features/content/components/guides/GuideDetailSidebar';
import { GuideActionBar } from '@features/content/components/guides/GuideActionBar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useContentBookmark } from '@features/content/components/shared/useContentBookmark';
import { ContentReportModal } from '@features/content/components/shared/ContentReportModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ContentCommentSection } from '@features/content/components/shared/ContentCommentSection';
import { ContentRatingWidget } from '@/components/reviews/ContentRatingWidget';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { useContentAnalytics } from '@features/content/hooks/useContentAnalytics';
import { downloadGuidePdf } from '@core/utils/export/guidePdfGenerator';
import { useGuideProgress } from '@features/content/hooks/useGuideProgress';
import type { Guide } from '@core/types/guide';
import type { Listing } from '@core/services/ListingService';

interface GuideDetailClientProps {
  slug: string;
  initialGuide: Guide | null;
  initialListing: Listing | null;
}

/**
 * GuideDetailClientInternal — handles state, layout, and sub-component composition
 */
function GuideDetailClientInternal({
  slug,
  initialGuide,
  initialListing
}: GuideDetailClientProps) {
  const router = useRouter();

  const [guide, setGuide] = useState<Guide | null>(initialGuide);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialGuide);
  const [error, setError] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useContentBookmark('guide', guide?.id ?? 0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const { trackContentEvent } = useContentAnalytics('guide', guide?.id);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // Progress tracking (authenticated users only)
  const {
    isAuthenticated: isProgressAvailable,
    completedSectionIds,
    percentComplete,
    toggleSectionComplete,
    updateLastAccessed,
    resumeSectionId,
    isLoading: isProgressLoading
  } = useGuideProgress(
    guide?.slug || slug,
    guide?.sections?.length || 0
  );

  // Track page view on mount
  useEffect(() => {
    if (guide?.id) {
      trackContentEvent('page_view');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id]);

  // Auto-resume: scroll to last section on mount (only if progress exists)
  useEffect(() => {
    if (!isProgressLoading && resumeSectionId && guide?.sections?.length) {
      // Find section number for this section_id
      const section = guide.sections.find(s => s.id === resumeSectionId);
      if (section) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          const el = document.getElementById(`section-${section.section_number}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isProgressLoading, resumeSectionId, guide?.sections]);

  // Fetch reviews for this guide
  useEffect(() => {
    async function fetchReviews() {
      if (!guide?.id) return;
      try {
        const res = await fetch(`/api/content/guides/${guide.id}/ratings?reviews=true&page=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data?.reviews || []);
        }
      } catch {}
    }
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id, reviewRefreshKey]);

  // Client-side fallback fetch — only runs if server did not provide initial data
  useEffect(() => {
    if (!initialGuide && slug) {
      fetchGuide();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialGuide]);

  const fetchGuide = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/content/guides/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Guide not found');
        }
        throw new Error('Failed to fetch guide');
      }

      const data = await response.json();
      const guideData: Guide = data.data?.guide;
      setGuide(guideData);

      // Fetch listing if guide has listing_id
      if (guideData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${guideData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guide');
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

  const handleDownloadPdf = useCallback(() => {
    if (!guide) return;
    downloadGuidePdf(guide, listing?.name ?? undefined);
    trackContentEvent('pdf_download');
  }, [guide, listing?.name, trackContentEvent]);

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
  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 text-lg font-medium">{error || 'Guide not found'}</p>
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
        contentType="guide"
        title={guide.title}
      />

      {/* Main Content Area — 2-column layout */}
      <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <GuideDetailHero
              guide={guide}
              listingName={listing?.name}
              listingLogo={listing?.logo_url ?? undefined}
              onShareClick={handleShareClick}
              onBookmarkClick={handleBookmarkClick}
              onReportClick={handleReportClick}
              isBookmarked={isBookmarked}
              onRecommendSuccess={handleRecommendSuccess}
              onDownloadPdf={handleDownloadPdf}
            />

            <GuideDetailContent
              guide={guide}
              activeSection={activeSection}
              onSectionVisible={(sectionNum) => {
                setActiveSection(sectionNum);
                // Update last accessed (fire-and-forget) when scrolling
                const section = guide.sections?.find(s => s.section_number === sectionNum);
                if (section) updateLastAccessed(section.id);
              }}
              completedSectionIds={completedSectionIds}
              onToggleSectionComplete={isProgressAvailable ? toggleSectionComplete : undefined}
            />

            <ContentRatingWidget contentType="guide" contentId={guide.id} className="mt-8" />

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
              contentType="guide"
              contentId={guide.id}
              contentTitle={guide.title}
            />
          </div>

          {/* Sidebar */}
          <div className="order-last lg:order-none">
            <GuideDetailSidebar
              guide={guide}
              listing={listing}
              activeSection={activeSection}
              completedSectionIds={completedSectionIds}
              percentComplete={percentComplete}
              isProgressAvailable={isProgressAvailable}
            />
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <GuideActionBar
        guide={guide}
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
        entityType="guide"
        entityId={guide.id}
        entityName={guide.title}
        onSuccess={() => {
          setShowWriteReview(false);
          setReviewRefreshKey(prev => prev + 1);
        }}
      />

      {/* Report Modal */}
      <ContentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        contentType="guide"
        contentId={guide.id}
        contentTitle={guide.title}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="guide"
        contentTitle={guide.title}
        contentSlug={guide.slug || slug}
        contentImage={guide.featured_image ?? null}
        contentExcerpt={guide.excerpt ?? null}
        listingName={listing?.name ?? null}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
}

/**
 * GuideDetailClient with ErrorBoundary wrapper
 * @tier STANDARD — Requires ErrorBoundary per Build Map v2.1
 */
export function GuideDetailClient(props: GuideDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="GuideDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this guide. Please try again.
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
      <GuideDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
