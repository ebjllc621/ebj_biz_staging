/**
 * PodcasterDetailClient - Client Component for Podcaster Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C (Podcaster Parity)
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for podcaster detail page.
 * Receives initial data from server component for optimal LCP.
 *
 * @see src/app/affiliate-marketers/[slug]/AffiliateMarketerDetailClient.tsx - Canonical detail client pattern
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PodcasterDetailHero } from '@features/content/components/podcasters/PodcasterDetailHero';
import { PodcasterDetailContent } from '@features/content/components/podcasters/PodcasterDetailContent';
import { PodcasterDetailSidebar } from '@features/content/components/podcasters/PodcasterDetailSidebar';
import { ProfileContactModal } from '@features/content/components/ProfileContactModal';
import { ProfileReviewModal } from '@features/content/components/ProfileReviewModal';
import { ContentShareModal } from '@features/content/components/shared/ContentShareModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { PodcasterProfile } from '@core/types/podcaster';

interface PodcasterDetailClientProps {
  slug: string;
  initialPodcaster: PodcasterProfile | null;
}

function PodcasterDetailClientInternal({
  slug,
  initialPodcaster
}: PodcasterDetailClientProps) {
  const router = useRouter();
  const [podcaster] = useState<PodcasterProfile | null>(initialPodcaster);
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

  if (!podcaster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Profile Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The podcaster profile you are looking for does not exist or may have been removed.
          </p>
          <a
            href="/podcasters"
            className="inline-block px-6 py-3 bg-biz-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Browse Podcasters
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
        <PodcasterDetailHero
          podcaster={podcaster}
          onContactClick={handleContactClick}
          onShareClick={handleShareClick}
          onRecommendSuccess={handleRecommendSuccess}
        />

        {/* Responsive Grid: Main Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Main Content — col-span-2 */}
          <div className="lg:col-span-2">
            <PodcasterDetailContent
              podcaster={podcaster}
              onWriteReview={() => setIsReviewOpen(true)}
              refreshKey={reviewRefreshKey}
            />
          </div>

          {/* Sidebar — col-span-1 */}
          <div>
            <PodcasterDetailSidebar
              podcaster={podcaster}
              onContactClick={handleContactClick}
            />
          </div>
        </div>
      </div>

      {/* Contact/Proposal Modal */}
      <ProfileContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        profileType="podcaster"
        profileSlug={slug}
        profileName={podcaster.podcast_name || podcaster.display_name}
      />

      {/* Share Modal */}
      <ContentShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        contentType="podcast"
        contentTitle={podcaster.podcast_name || podcaster.display_name}
        contentSlug={podcaster.slug || slug}
        contentImage={podcaster.profile_image ?? null}
        contentExcerpt={podcaster.headline ?? null}
        listingName={null}
      />

      {/* Review Modal */}
      <ProfileReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        profileType="podcaster"
        profileId={podcaster.id}
        profileName={podcaster.podcast_name || podcaster.display_name}
        onReviewSubmitted={() => setReviewRefreshKey(k => k + 1)}
      />
    </div>
  );
}

export function PodcasterDetailClient(props: PodcasterDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="PodcasterDetailClient"
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
              href="/podcasters"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse Podcasters
            </a>
          </div>
        </div>
      }
    >
      <PodcasterDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
