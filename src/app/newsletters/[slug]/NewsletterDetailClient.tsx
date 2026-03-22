/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase N3 - Newsletter Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for newsletter detail page. Receives initial data from server
 * component for optimal LCP. Composes NewsletterDetailHero, NewsletterDetailContent,
 * NewsletterDetailSidebar, and NewsletterActionBar.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { NewsletterDetailHero } from '@features/content/components/newsletters/NewsletterDetailHero';
import { NewsletterDetailContent } from '@features/content/components/newsletters/NewsletterDetailContent';
import { NewsletterDetailSidebar } from '@features/content/components/newsletters/NewsletterDetailSidebar';
import { NewsletterActionBar } from '@features/content/components/newsletters/NewsletterActionBar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useContentBookmark } from '@features/content/components/shared/useContentBookmark';
import { ContentReportModal } from '@features/content/components/shared/ContentReportModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ContentCommentSection } from '@features/content/components/shared/ContentCommentSection';
import { useContentAnalytics } from '@features/content/hooks/useContentAnalytics';
import type { Newsletter } from '@core/types/newsletter';
import type { Listing } from '@core/services/ListingService';

interface NewsletterDetailClientProps {
  slug: string;
  initialNewsletter: Newsletter | null;
  initialListing: Listing | null;
}

/**
 * NewsletterDetailClientInternal — handles state, layout, and sub-component composition
 */
function NewsletterDetailClientInternal({
  slug,
  initialNewsletter,
  initialListing
}: NewsletterDetailClientProps) {
  const router = useRouter();

  const [newsletter, setNewsletter] = useState<Newsletter | null>(initialNewsletter);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialNewsletter);
  const [error, setError] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useContentBookmark('newsletter', newsletter?.id ?? 0);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { trackContentEvent } = useContentAnalytics('newsletter', newsletter?.id);

  // Track page view on mount
  useEffect(() => {
    if (newsletter?.id) {
      trackContentEvent('page_view');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletter?.id]);

  // Client-side fallback fetch — only runs if server did not provide initial data
  useEffect(() => {
    if (!initialNewsletter && slug) {
      fetchNewsletter();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialNewsletter]);

  const fetchNewsletter = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/content/newsletters/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Newsletter not found');
        }
        throw new Error('Failed to fetch newsletter');
      }

      const data = await response.json();
      const newsletterData: Newsletter = data.data?.newsletter;
      setNewsletter(newsletterData);

      // Fetch listing if newsletter has listing_id
      if (newsletterData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${newsletterData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load newsletter');
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
  if (error || !newsletter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 text-lg font-medium">{error || 'Newsletter not found'}</p>
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
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-biz-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content Area — 2-column layout */}
      <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <NewsletterDetailHero
              newsletter={newsletter}
              listingName={listing?.name}
              listingLogo={listing?.logo_url ?? undefined}
              onShareClick={handleShareClick}
              onBookmarkClick={handleBookmarkClick}
              onReportClick={handleReportClick}
              isBookmarked={isBookmarked}
              onRecommendSuccess={handleRecommendSuccess}
            />

            <NewsletterDetailContent newsletter={newsletter} />

            <ContentCommentSection
              contentType="newsletter"
              contentId={newsletter.id}
              contentTitle={newsletter.title}
            />
          </div>

          {/* Sidebar */}
          <div className="order-last lg:order-none">
            <NewsletterDetailSidebar newsletter={newsletter} listing={listing} />
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <NewsletterActionBar
        newsletter={newsletter}
        onShareClick={handleShareClick}
        onBookmarkClick={handleBookmarkClick}
        onReportClick={handleReportClick}
        isBookmarked={isBookmarked}
        onRecommendSuccess={handleRecommendSuccess}
      />

      {/* Report Modal */}
      <ContentReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        contentType="newsletter"
        contentId={newsletter.id}
        contentTitle={newsletter.title}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="newsletter"
        contentTitle={newsletter.title}
        contentSlug={newsletter.slug || slug}
        contentImage={newsletter.featured_image ?? null}
        contentExcerpt={newsletter.excerpt ?? null}
        listingName={listing?.name ?? null}
        onShareComplete={handleShareComplete}
      />
    </div>
  );
}

/**
 * NewsletterDetailClient with ErrorBoundary wrapper
 * @tier STANDARD — Requires ErrorBoundary per Build Map v2.1
 */
export function NewsletterDetailClient(props: NewsletterDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="NewsletterDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this newsletter. Please try again.
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
      <NewsletterDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
