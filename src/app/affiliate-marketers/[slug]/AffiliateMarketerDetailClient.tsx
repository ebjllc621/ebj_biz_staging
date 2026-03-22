/**
 * AffiliateMarketerDetailClient - Client Component for Affiliate Marketer Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for affiliate marketer detail page.
 * Receives initial data from server component for optimal LCP.
 * Phase 3A: Core layout with placeholder content/sidebar sections (Phase 3B fills these).
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AffiliateMarketerDetailHero } from '@features/content/components/affiliate-marketers/AffiliateMarketerDetailHero';
import { AffiliateMarketerDetailContent } from '@features/content/components/affiliate-marketers/AffiliateMarketerDetailContent';
import { AffiliateMarketerDetailSidebar } from '@features/content/components/affiliate-marketers/AffiliateMarketerDetailSidebar';
import { ProfileContactModal } from '@features/content/components/ProfileContactModal';
import { ProfileReviewModal } from '@features/content/components/ProfileReviewModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';

interface AffiliateMarketerDetailClientProps {
  slug: string;
  initialMarketer: AffiliateMarketerProfile | null;
}

/**
 * AffiliateMarketerDetailClientInternal - inner component
 */
function AffiliateMarketerDetailClientInternal({
  slug,
  initialMarketer
}: AffiliateMarketerDetailClientProps) {
  const router = useRouter();
  const [marketer] = useState<AffiliateMarketerProfile | null>(initialMarketer);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const handleContactClick = useCallback(() => {
    setIsContactOpen(true);
  }, []);

  const handleShareClick = useCallback(() => {
    setIsShareOpen(true);
  }, []);

  const handleRecommendSuccess = useCallback(() => {
    // Could show a toast notification
  }, []);

  // Not-found state
  if (!marketer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Profile Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The affiliate marketer profile you are looking for does not exist or may have been removed.
          </p>
          <a
            href="/affiliate-marketers"
            className="inline-block px-6 py-3 bg-biz-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Browse Affiliate Marketers
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-biz-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero — full width */}
        <AffiliateMarketerDetailHero
          marketer={marketer}
          onContactClick={handleContactClick}
          onShareClick={handleShareClick}
          onRecommendSuccess={handleRecommendSuccess}
        />

        {/* Responsive Grid: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content — col-span-2 */}
          <div className="lg:col-span-2">
            <AffiliateMarketerDetailContent
              marketer={marketer}
              onWriteReview={() => setIsReviewOpen(true)}
              refreshKey={reviewRefreshKey}
            />
          </div>

          {/* Sidebar — col-span-1 */}
          <div>
            <AffiliateMarketerDetailSidebar
              marketer={marketer}
              onContactClick={handleContactClick}
            />
          </div>
        </div>
      </div>

      {/* Contact/Proposal Modal (Phase 5) */}
      <ProfileContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        profileType="affiliate_marketer"
        profileSlug={slug}
        profileName={marketer.display_name}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="article"
        contentTitle={marketer.display_name}
        contentSlug={marketer.slug || slug}
        contentImage={marketer.profile_image ?? null}
        contentExcerpt={marketer.headline ?? null}
        listingName={null}
      />

      {/* Review Modal (Phase 6) */}
      <ProfileReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        profileType="affiliate_marketer"
        profileId={marketer.id}
        profileName={marketer.display_name}
        onReviewSubmitted={() => setReviewRefreshKey(k => k + 1)}
      />
    </div>
  );
}

/**
 * AffiliateMarketerDetailClient with ErrorBoundary wrapper
 * @tier ADVANCED - Requires ErrorBoundary per Build Map v2.1
 */
export function AffiliateMarketerDetailClient(props: AffiliateMarketerDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="AffiliateMarketerDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this profile. Please try again.
            </p>
            <a
              href="/affiliate-marketers"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse Affiliate Marketers
            </a>
          </div>
        </div>
      }
    >
      <AffiliateMarketerDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
